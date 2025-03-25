import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Customer, type Product, type Invoice } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

// Componentes UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Plus,
  Eye, 
  Edit, 
  Save, 
  FileText,
  DollarSign,
  Building2,
  Phone,
  Mail,
  MapPin,
  User,
  CreditCard
} from "lucide-react";

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
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredInvoices = invoices.filter((invoice) => {
    const customerName = invoice.businessName || 
      customers.find(c => c.id === invoice.customerId)?.businessname || "";
    
    return customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.id.toString().includes(searchQuery);
  });

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

  const StatusBadge = ({ status }: { status: string }) => (
    <Badge variant={
      status === "paid" ? "success" : 
      status === "partial" ? "warning" : 
      status === "cancelled" ? "destructive" : 
      "outline"
    } className="text-xs px-2 py-0.5">
      {status === "paid" ? "Pagada" : 
       status === "partial" ? "Parcial" : 
       status === "cancelled" ? "Cancelada" : 
       "Pendiente"
      }
    </Badge>
  );

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Facturación</h1>

      <Tabs defaultValue="facturas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="facturas">Facturas</TabsTrigger>
          <TabsTrigger value="nueva">Nueva Factura</TabsTrigger>
        </TabsList>
        
        {/* Pestaña de Facturas */}
        <TabsContent value="facturas">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <CardTitle className="text-lg">Listado de Facturas</CardTitle>
                <div className="relative w-full md:max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar factura por cliente..."
                    className="w-full pl-8 h-9 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                    ) : filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                          No hay facturas disponibles.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="py-2">
                            <div className="font-medium text-sm">
                              {invoice.businessName || 
                                customers.find(c => c.id === invoice.customerId)?.businessname ||
                                "Cliente"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {invoice.totalPaid && invoice.total && 
                                (parseFloat(invoice.totalPaid) >= parseFloat(invoice.total) 
                                  ? "Pagada Completamente" 
                                  : `Pendiente: ${
                                      parseFloat(invoice.pendingAmount || "0").toFixed(2)
                                    }`
                                )
                              }
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(invoice.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {invoice.id}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={invoice.status} />
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {parseFloat(invoice.total).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setIsDetailsDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
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
            <CardHeader>
              <CardTitle className="text-lg">Nueva Factura</CardTitle>
              <CardDescription>
                Crear una nueva factura para un cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulario */}
              <div className="space-y-4">
                {/* Cliente */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-3">
                    <label className="text-sm font-medium">Cliente</label>
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
                  </div>

                  {selectedCustomer && (
                    <>
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Nombre del Gerente</div>
                        <div className="text-sm">{selectedCustomer.managername}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Dirección</div>
                        <div className="text-sm">{selectedCustomer.street} {selectedCustomer.streetnumber}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">Teléfono</div>
                        <div className="text-sm">{selectedCustomer.phone}</div>
                      </div>
                    </>
                  )}

                  {/* Campo de Notas */}
                  <div className="space-y-2 md:col-span-3">
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

                {/* Método de Pago */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Método de Pago</label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('cash')}
                      className="text-xs flex-1"
                    >
                      Efectivo
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMethod === 'credit' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('credit')}
                      className="text-xs flex-1"
                    >
                      Crédito
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMethod === 'card' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('card')}
                      className="text-xs flex-1"
                    >
                      Tarjeta
                    </Button>
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
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product: Product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id.toString()}
                                      className="text-xs"
                                    >
                                      {product.code} - {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-xs">{item.description}</TableCell>
                            <TableCell className="p-0.5">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                                className="h-8 text-xs text-right"
                                min="0"
                              />
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {item.price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {item.total.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {/* Totales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2"></div>
                  <div className="space-y-2 p-3 bg-muted rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${calculateTotal().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>ITBIS (18%):</span>
                      <span>${calculateTotal().tax.toFixed(2)}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>${calculateTotal().total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleCreateInvoice}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                        Creando...
                      </>
                    ) : (
                      "Crear Factura"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Visualizar Detalles de Factura (Dialog) */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="w-[98vw] sm:w-[90vw] max-w-2xl p-2 sm:p-4">
          {selectedInvoice && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-lg">Detalles de Factura #{selectedInvoice.id}</DialogTitle>
              </DialogHeader>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <h3 className="font-semibold text-sm">Cliente</h3>
                      <p className="text-sm">
                        {selectedInvoice.businessName || 
                          customers.find(c => c.id === selectedInvoice.customerId)?.businessname}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Fecha</h3>
                      <p className="text-sm">
                        {new Date(selectedInvoice.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Total</h3>
                      <p className="text-sm">${parseFloat(selectedInvoice.total).toFixed(2)}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Estado</h3>
                      <StatusBadge status={selectedInvoice.status} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">Método de Pago</h3>
                      <p className="text-sm">
                        {selectedInvoice.paymentMethod === "cash" ? "Efectivo" :
                          selectedInvoice.paymentMethod === "credit" ? "Crédito" : "Tarjeta"}
                      </p>
                    </div>
                    {selectedInvoice.notes && (
                      <div className="col-span-full">
                        <h3 className="font-semibold text-sm">Notas</h3>
                        <p className="text-sm">{selectedInvoice.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Líneas de Detalle */}
                  <div className="border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Producto</TableHead>
                          <TableHead className="text-xs text-right">Cantidad</TableHead>
                          <TableHead className="text-xs text-right">Precio</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceDetails.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-2 text-sm">
                              Cargando detalles...
                            </TableCell>
                          </TableRow>
                        ) : (
                          invoiceDetails.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="py-1 text-sm">
                                {products.find((p: Product) => p.id === item.productId)?.name}
                              </TableCell>
                              <TableCell className="py-1 text-right text-sm">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="py-1 text-right text-sm">
                                {parseFloat(item.price).toFixed(2)}
                              </TableCell>
                              <TableCell className="py-1 text-right text-sm">
                                {parseFloat(item.total).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Saldo y Pagos */}
                  {selectedInvoice.pendingAmount && selectedInvoice.status !== "paid" && (
                    <div className="bg-muted p-3 rounded space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Facturado:</span>
                        <span>${parseFloat(selectedInvoice.total).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Pagado:</span>
                        <span>${parseFloat(selectedInvoice.totalPaid || "0").toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span>Saldo Pendiente:</span>
                        <span>${parseFloat(selectedInvoice.pendingAmount).toFixed(2)}</span>
                      </div>

                      <div className="pt-2 border-t mt-2">
                        <h4 className="text-sm font-medium mb-1">Realizar Pago</h4>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Monto a pagar"
                            className="h-8 text-sm flex-1"
                            min="0.01"
                            max={selectedInvoice.pendingAmount}
                            step="0.01"
                            id="payment-amount"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const amountInput = document.getElementById('payment-amount') as HTMLInputElement;
                              handlePayment(selectedInvoice, amountInput.value);
                            }}
                            disabled={createPaymentMutation.isPending}
                          >
                            {createPaymentMutation.isPending ? "Procesando..." : "Pagar"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cambiar Método de Pago */}
                  <div className="pt-2">
                    <h4 className="text-sm font-medium mb-1">Actualizar Método de Pago</h4>
                    <Select
                      defaultValue={selectedInvoice.paymentMethod}
                      onValueChange={(value) => handlePaymentMethodChange(selectedInvoice.id, value as 'cash' | 'credit' | 'card')}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="credit">Crédito</SelectItem>
                        <SelectItem value="card">Tarjeta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}