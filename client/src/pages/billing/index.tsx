import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { type Customer, type Product, type Invoice } from "@shared/schema";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OrderItem {
  id?: number;
  code: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

interface InvoiceWithDetails extends Invoice {
  customerName?: string;
  businessName?: string;
  totalPaid?: string;
  pendingAmount?: string;
}

export default function Billing() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{
    code: "",
    description: "",
    quantity: 0,
    price: 0,
    total: 0
  }]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'card'>('cash');

  // Consultas para obtener datos
  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    error: invoicesError
  } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/invoices");
      if (!response.ok) {
        throw new Error('Error al cargar facturas');
      }
      return response.json();
    }
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/customers");
      if (!response.ok) {
        throw new Error('Error al cargar clientes');
      }
      return response.json();
    }
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/products");
      if (!response.ok) {
        throw new Error('Error al cargar productos');
      }
      return response.json();
    }
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
    const product = products.find(p => p.id.toString() === code);
    if (!product) return;

    const newItems = [...orderItems];
    newItems[index] = {
      ...newItems[index],
      code,
      description: product.name,
      quantity: 1,
      price: parseFloat(product.price.toString()),
      total: parseFloat(product.price.toString())
    };

    if (index === orderItems.length - 1 && code !== "") {
      newItems.push({
        code: "",
        description: "",
        quantity: 0,
        price: 0,
        total: 0
      });
    }

    setOrderItems(newItems);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newItems = [...orderItems];
    const item = newItems[index];
    if (!item) return;

    item.quantity = quantity;
    item.total = item.price * quantity;
    setOrderItems(newItems);
  };

  const calculateTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const tax = subtotal * 0.18;
    return { subtotal, tax, total: subtotal + tax };
  };

  const createMutation = useMutation({
    mutationFn: async (data: { customerId: string; items: OrderItem[] }) => {
      const validItems = orderItems.filter(item => item.quantity > 0);
      if (validItems.length === 0) {
        throw new Error('Debe agregar al menos un producto');
      }

      const subtotal = validItems.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.18;
      const total = subtotal + tax;

      const invoiceData = {
        customerId: parseInt(data.customerId),
        total: total.toFixed(2),
        status: "pending" as const,
        paymentMethod,
        notes,
      };

      const invoiceResponse = await apiRequest("POST", "/api/invoices", invoiceData);
      if (!invoiceResponse.ok) {
        throw new Error('Error al crear la factura');
      }

      const invoice = await invoiceResponse.json();

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
      setOrderItems([{
        code: "",
        description: "",
        quantity: 0,
        price: 0,
        total: 0
      }]);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const updatePaymentMethodMutation = useMutation({
    mutationFn: async ({ invoiceId, paymentMethod }: { invoiceId: number, paymentMethod: string }) => {
      const response = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, {
        paymentMethod,
      });
      if (!response.ok) {
        throw new Error('Error al actualizar el método de pago');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsDetailsDialogOpen(false);
      toast({
        title: "Éxito",
        description: "Método de pago actualizado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const updateInvoiceItemsMutation = useMutation({
    mutationFn: async ({ invoiceId, items }: { invoiceId: number, items: OrderItem[] }) => {
      for (const item of items) {
        if (item.id) {
          const response = await apiRequest("PATCH", `/api/invoices/${invoiceId}/items/${item.id}`, {
            quantity: item.quantity,
            price: item.price.toFixed(2),
            total: item.total.toFixed(2),
          });
          if (!response.ok) {
            throw new Error('Error al actualizar items de la factura');
          }
        } else {
          const response = await apiRequest("POST", `/api/invoices/${invoiceId}/items`, {
            invoiceId,
            productId: parseInt(item.code),
            quantity: item.quantity,
            price: item.price.toFixed(2),
            total: item.total.toFixed(2),
          });
          if (!response.ok) {
            throw new Error('Error al agregar nuevos items a la factura');
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Éxito",
        description: "Factura actualizada exitosamente",
      });
      setIsDetailsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const createPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, amount, customerId }: { invoiceId: number, amount: string, customerId: number }) => {
      const paymentData = {
        invoiceId,
        customerId,
        amount,
        paymentMethod: "cash",
        date: new Date().toISOString(),
        reference: "",
        notes: `Pago de factura #${invoiceId}`
      };

      console.log("Sending payment:", paymentData);

      const response = await apiRequest("POST", "/api/payments", paymentData);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al procesar el pago');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({
        title: "Éxito",
        description: "Pago procesado exitosamente",
      });
    },
    onError: (error: Error) => {
      console.error("Payment error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const handlePayment = (invoice: InvoiceWithDetails, amount: string) => {
    if (!invoice?.pendingAmount || !amount) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Datos de factura inválidos"
      });
      return;
    }

    const pendingAmount = Number(parseFloat(invoice.pendingAmount).toFixed(2));
    const paymentAmount = Number(parseFloat(amount).toFixed(2));

    console.log("Cálculo de montos:", {
      total: Number(parseFloat(invoice.total).toFixed(2)),
      totalPaid: Number(parseFloat(invoice.totalPaid || "0").toFixed(2)),
      pendingAmount,
      paymentAmount
    });

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El monto debe ser mayor a 0"
      });
      return;
    }

    if (paymentAmount > pendingAmount) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `El monto (${paymentAmount.toFixed(2)}) excede el saldo pendiente (${pendingAmount.toFixed(2)})`
      });
      return;
    }

    createPaymentMutation.mutate({
      invoiceId: invoice.id,
      amount: paymentAmount.toFixed(2),
      customerId: invoice.customerId
    });
  };

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
      customerId: selectedCustomer.id.toString(),
      items: validItems
    });
  };

  const handlePaymentMethodChange = async (invoiceId: number, newPaymentMethod: 'cash' | 'credit' | 'card') => {
    updatePaymentMethodMutation.mutate({ invoiceId, paymentMethod: newPaymentMethod });
  };

  const handleStartEdit = () => {
    if (!selectedInvoice || !invoiceDetails) return;

    const existingItems = invoiceDetails.map((item: any) => ({
      id: item.id,
      code: item.productId.toString(),
      description: products.find(p => p.id === item.productId)?.name || '',
      quantity: item.quantity,
      price: parseFloat(item.price),
      total: parseFloat(item.total)
    }));

    const emptyRows = Array(3).fill({
      code: "",
      description: "",
      quantity: 0,
      price: 0,
      total: 0
    });

    setOrderItems([...existingItems, ...emptyRows]);
  };

  const handleSaveEdit = (invoiceId: number) => {
    const validItems = orderItems.filter(item => item.quantity > 0);
    if (validItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe tener al menos un producto"
      });
      return;
    }
    updateInvoiceItemsMutation.mutate({ invoiceId, items: validItems });
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
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
                    const customer = customers.find((c: Customer) => c.id === parseInt(value));
                    setSelectedCustomer(customer || null);
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Seleccionar Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer: Customer) => (
                      <SelectItem
                        key={customer.id}
                        value={customer.id.toString()}
                        className="text-sm py-2"
                      >
                        {customer.businessname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedCustomer && (
                  <div className="text-sm grid grid-cols-1 gap-2 bg-muted p-2 rounded">
                    <div>
                      <span className="font-medium">Nombre: </span>
                      {selectedCustomer.managername}
                    </div>
                    <div>
                      <span className="font-medium">Dirección: </span>
                      {selectedCustomer.street} {selectedCustomer.streetnumber}
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
                                {products.map((product) => (
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

      {/* Contenido principal con pestañas */}
      <Tabs defaultValue="facturas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="facturas">Facturas</TabsTrigger>
          <TabsTrigger value="nueva">Nueva Factura</TabsTrigger>
        </TabsList>
        
        {/* Pestaña de Facturas */}
        <TabsContent value="facturas">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Listado de Facturas</CardTitle>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar factura por cliente..."
                    className="w-full pl-8 h-9 text-sm"
                  />
                </div>
              </div>
              <CardDescription>
                Gestione las facturas emitidas a los clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-250px)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs">Fecha</TableHead>
                      <TableHead className="text-xs">Factura No.</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                      <TableHead className="text-xs">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
            <TableBody>
              {invoicesError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-red-500">
                    Error al cargar facturas: {invoicesError.message}
                  </TableCell>
                </TableRow>
              ) : isLoadingInvoices ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent"></div>
                      <span>Cargando facturas...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No hay facturas registradas
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => {
                  const customer = customers.find((c: Customer) => c.id === invoice.customerId);
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>{customer?.businessname || 'Cliente no encontrado'}</TableCell>
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
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsDetailsDialogOpen(true);
                            }}
                          >
                            Ver detalles
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsDetailsDialogOpen(true);
                            }}
                          >
                            Pagar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Nueva Factura */}
        <TabsContent value="nueva">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Crear Nueva Factura</CardTitle>
              <CardDescription>
                Complete el formulario para crear una nueva factura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Cliente y Notas */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Cliente</label>
                    <Select
                      onValueChange={(value) => {
                        const customer = customers.find((c: Customer) => c.id === parseInt(value));
                        setSelectedCustomer(customer || null);
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm mt-1">
                        <SelectValue placeholder="Seleccionar Cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer: Customer) => (
                          <SelectItem
                            key={customer.id}
                            value={customer.id.toString()}
                            className="text-sm py-2"
                          >
                            {customer.businessname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Método de Pago</label>
                    <div className="mt-1">
                      <Select
                        value={paymentMethod}
                        onValueChange={(value) => setPaymentMethod(value as 'cash' | 'credit' | 'card')}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Efectivo</SelectItem>
                          <SelectItem value="credit">Crédito</SelectItem>
                          <SelectItem value="card">Tarjeta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedCustomer && (
                    <div className="text-sm md:col-span-3 bg-muted p-3 rounded-lg">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-medium">Nombre: </span>
                          {selectedCustomer.managername}
                        </div>
                        <div>
                          <span className="font-medium">RNC: </span>
                          {selectedCustomer.rnc || "No disponible"}
                        </div>
                        <div>
                          <span className="font-medium">Teléfono: </span>
                          {selectedCustomer.phone}
                        </div>
                        <div>
                          <span className="font-medium">Dirección: </span>
                          {selectedCustomer.street} {selectedCustomer.streetnumber}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-3">
                    <label className="text-sm font-medium">Nota</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => {
                        if (e.target.value.length <= 200) {
                          setNotes(e.target.value);
                        }
                      }}
                      placeholder="Añadir nota a la factura (máximo 200 caracteres)"
                      className="h-20 text-sm resize-none mt-1"
                      maxLength={200}
                    />
                    <div className="text-xs text-muted-foreground text-right mt-1">
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
                          <TableHead className="w-20 text-xs sticky top-0 bg-background">Código</TableHead>
                          <TableHead className="text-xs sticky top-0 bg-background">Descripción</TableHead>
                          <TableHead className="w-16 text-right text-xs sticky top-0 bg-background">Cant.</TableHead>
                          <TableHead className="w-24 text-right text-xs sticky top-0 bg-background">Precio</TableHead>
                          <TableHead className="w-24 text-right text-xs sticky top-0 bg-background">Total</TableHead>
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
                                  {products.map((product) => (
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

                {/* Totales y Botón */}
                <div className="grid md:grid-cols-2 gap-4 items-end">
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
                    className="w-full h-10"
                    disabled={!selectedCustomer || !orderItems.some(item => item.quantity > 0)}
                    onClick={handleCreateInvoice}
                  >
                    {createMutation.isPending ? "Creando..." : "Crear Factura"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                    {customers.find((c: Customer) => c.id === selectedInvoice.customerId)?.businessname}
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
                  {selectedInvoice.notes && (
                    <div className="col-span-2 mt-2">
                      <span className="font-medium">Notas: </span>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedInvoice.notes}</p>
                    </div>
                  )}
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
                          {products.find((p: Product) => p.id === item.productId)?.name}
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleStartEdit}
                      >
                        Editar Factura
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[98vw] sm:w-[90vw] max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Editar Factura #{selectedInvoice?.id}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        {/* Tabla de Productos */}
                        <div className="border rounded-lg overflow-hidden">
                          <ScrollArea className="h-[35vh]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Código</TableHead>
                                  <TableHead>Descripción</TableHead>
                                  <TableHead className="text-right">Cant.</TableHead>
                                  <TableHead className="text-right">Precio</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {orderItems.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="p-0.5">
                                      {item.id ? (
                                        // Item existente - mostrar código fijo
                                        <Input
                                          value={item.code}
                                          readOnly
                                          className="bg-muted h-8"
                                        />
                                      ) : (
                                        // Nuevo item - permitir selección
                                        <Select
                                          value={item.code}
                                          onValueChange={(value) => handleProductChange(index, value)}
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue placeholder="---" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {products.map((product) => (
                                              <SelectItem
                                                key={product.id}
                                                value={product.id.toString()}
                                              >
                                                {product.id}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                    </TableCell>
                                    <TableCell className="p-0.5">
                                      <Input
                                        value={item.description}
                                        readOnly
                                        className="bg-muted h-8"
                                      />
                                    </TableCell>
                                    <TableCell className="p-0.5">
                                      <Input
                                        type="number"
                                        min="0"
                                        value={item.quantity}
                                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                                        className="text-right h-8"
                                      />
                                    </TableCell>
                                    <TableCell className="p-0.5">
                                      <Input
                                        value={item.price ? `RD$ ${item.price.toFixed(2)}` : ""}
                                        readOnly
                                        className="text-right bg-muted h-8"
                                      />
                                    </TableCell>
                                    <TableCell className="p-0.5">
                                      <Input
                                        value={item.total ? `RD$ ${item.total.toFixed(2)}` : ""}
                                        readOnly
                                        className="text-right bg-muted h-8"
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => handleSaveEdit(selectedInvoice!.id)}
                          disabled={!orderItems.some(item => item.quantity > 0)}
                        >
                          Guardar Cambios
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        Cambiar Método de Pago
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cambiar Método de Pago</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Select
                          defaultValue={selectedInvoice.paymentMethod}
                          onValueChange={(value) => handlePaymentMethodChange(selectedInvoice.id, value as 'cash' | 'credit' | 'card')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="credit">Crédito</SelectItem>
                            <SelectItem value="card">Tarjeta</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Método de pago actual: {
                            selectedInvoice.paymentMethod === "cash" ? "Efectivo" :
                              selectedInvoice.paymentMethod === "credit" ? "Crédito" :
                                "Tarjeta"
                          }
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}