import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Customer, type Product, type Invoice } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PrinterService } from "@/services/PrinterService";
import { toRD } from "@/lib/date-utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Componentes UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Receipt,
  X,
  Check,
  ChevronsUpDown,
  Printer,
  FileDown,
  Eye,
  ListFilter,
  FileText,
  CheckCircle,
  Clock,
  DollarSign,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

interface InvoiceWithDetails extends Invoice {
  customerName?: string;
  businessName?: string;
  totalPaid?: string;
  pendingAmount?: string;
}

export default function Billing() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("new");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [openCustomerPopover, setOpenCustomerPopover] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'card' | 'transfer'>('cash');
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);

  // Consultas para obtener datos
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"]
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"]
  });

  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
  } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"]
  });

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/settings"]
  });

  const { 
    data: invoiceDetails = [], 
    isLoading: isLoadingDetails 
  } = useQuery<any[]>({
    queryKey: [`/api/invoices/${selectedInvoice?.id}/items`],
    enabled: !!selectedInvoice,
  });

  // Obtener saldo del cliente seleccionado
  const { data: customerBalance, isLoading: isLoadingBalance } = useQuery({
    queryKey: ["/api/customers", selectedCustomer?.id, "balance"],
    queryFn: async () => {
      if (!selectedCustomer) return null;
      const response = await fetch(`/api/customers/${selectedCustomer.id}/balance`);
      if (!response.ok) throw new Error("Error al obtener balance del cliente");
      return await response.json();
    },
    enabled: !!selectedCustomer,
  });

  // Calcular saldo a favor del cliente
  const availableAdvances = customerBalance?.availableAdvances || [];
  const totalAdvances = parseFloat(customerBalance?.balance?.availableAdvances || "0");

  // Filtrar clientes
  const filteredCustomers = customers.filter((customer) => {
    if (!customerSearchTerm) return true;
    const searchLower = customerSearchTerm.toLowerCase();
    const businessName = (customer.businessname || "").toLowerCase();
    const phone = String(customer.phone ?? "").toLowerCase();
    return businessName.includes(searchLower) || phone.includes(searchLower);
  });

  // Filtrar productos
  const filteredProducts = products.filter((product) => {
    if (!productSearchTerm) return true;
    const searchLower = productSearchTerm.toLowerCase();
    return product.name.toLowerCase().includes(searchLower);
  });

  // Filtrar facturas
  const filteredInvoices = invoices.filter((invoice) => {
    const customerName = invoice.businessName || 
      customers.find((c) => c.id === invoice.customerId)?.businessname || "";
    const matchesSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.id.toString().includes(searchQuery);

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "partial") {
      return matchesSearch && 
             invoice.status === "pending" && 
             parseFloat(invoice.totalPaid || "0") > 0 && 
             parseFloat(invoice.pendingAmount || "0") > 0;
    }
    return matchesSearch && invoice.status === statusFilter;
  });

  // Funciones del carrito
  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price: parseFloat(product.price.toString()),
        quantity: 1
      }]);
    }
    toast({
      title: "Producto agregado",
      description: `${product.name} agregado al carrito`,
    });
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setPaymentMethod('cash');
  };

  // Cálculos
  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = settings?.tax ? parseFloat(settings.tax) / 100 : 0;
    const tax = subtotal * taxRate;
    return { subtotal, tax, total: subtotal + tax };
  };

  const { subtotal, tax, total } = calculateTotal();

  // Mutación para crear factura
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) throw new Error('Debe seleccionar un cliente');
      if (cart.length === 0) throw new Error('Debe agregar al menos un producto');

      // Si el saldo a favor cubre el total, usar 'credit' automáticamente
      // Los anticipos se aplicarán automáticamente en el backend
      const finalPaymentMethod = (totalAdvances >= total && total > 0) ? 'credit' : paymentMethod;

      const invoiceData = {
        customerId: selectedCustomer.id,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: finalPaymentMethod,
      };

      const invoiceResponse = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData)
      });
      
      if (!invoiceResponse.ok) {
        throw new Error('Error al crear la factura');
      }

      const invoice = await invoiceResponse.json();

      for (const item of cart) {
        const itemData = {
          invoiceId: invoice.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price.toFixed(2),
          total: (item.price * item.quantity).toFixed(2)
        };

        const itemResponse = await fetch(`/api/invoices/${invoice.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData)
        });
        
        if (!itemResponse.ok) {
          throw new Error('Error al crear items de la factura');
        }
      }

      return invoice;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", selectedCustomer?.id, "balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/payments-stats"] });
      
      // Determinar el mensaje según el flujo
      let title = "¡Factura creada!";
      let description = "La factura se creó exitosamente";
      
      if (totalAdvances >= total && total > 0) {
        title = "¡Factura pagada con saldo a favor!";
        description = `Se aplicaron RD$ ${Math.min(totalAdvances, total).toFixed(2)} de anticipos`;
      } else if (totalAdvances > 0 && totalAdvances < total) {
        if (paymentMethod === 'cash') {
          title = "¡Factura pagada!";
          description = `Se aplicaron RD$ ${totalAdvances.toFixed(2)} de anticipos + RD$ ${(total - totalAdvances).toFixed(2)} en efectivo`;
        } else {
          title = "¡Factura creada!";
          description = `Se aplicaron RD$ ${totalAdvances.toFixed(2)} de anticipos. Pendiente: RD$ ${(total - totalAdvances).toFixed(2)}`;
        }
      } else if (paymentMethod === 'cash') {
        title = "¡Factura pagada!";
        description = "La factura fue creada y marcada como pagada en efectivo";
      }
      
      toast({ title, description });
      clearCart();
      setActiveTab("list");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  // Funciones para imprimir
  const printInvoice = async (invoice: InvoiceWithDetails) => {
    try {
      toast({
        title: "Preparando impresión",
        description: "Por favor espere...",
      });
      
      const itemsResponse = await fetch(`/api/invoices/${invoice.id}/items`);
      if (!itemsResponse.ok) throw new Error('Error al cargar detalles');
      const items = await itemsResponse.json();
      
      await PrinterService.printInvoice(invoice, settings, customers, items);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo imprimir la factura",
      });
    }
  };

  const generatePDF = async (invoice: InvoiceWithDetails) => {
    try {
      toast({
        title: "Generando PDF",
        description: "Por favor espere...",
      });
      
      const itemsResponse = await fetch(`/api/invoices/${invoice.id}/items`);
      if (!itemsResponse.ok) throw new Error('Error al cargar detalles');
      const items = await itemsResponse.json();
      
      await PrinterService.generateInvoicePDF(invoice, settings, customers, items);
      
      toast({
        title: "¡Listo!",
        description: "PDF generado exitosamente",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo generar el PDF",
      });
    }
  };

  const handleViewInvoiceDetails = async (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setActiveTab("details");
  };

  // Estadísticas
  const totalPendientes = filteredInvoices.filter(i => i.status === "pending").length;
  const totalPagadas = filteredInvoices.filter(i => i.status === "paid").length;
  const totalMonto = filteredInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.total || "0"), 0);

  const StatusBadge = ({ status, invoice }: { status: string, invoice?: InvoiceWithDetails }) => {
    let variant: "default" | "destructive" | "outline" | "secondary" = "outline";
    let label = "Pendiente";
    
    if (status === "paid") {
      variant = "default";
      label = "Pagada";
    } else if (status === "cancelled") {
      variant = "destructive";
      label = "Cancelada";
    }
    
    if (status === "pending" && invoice && parseFloat(invoice.totalPaid || "0") > 0) {
      variant = "secondary";
      label = "Parcial";
    }
    
    return <Badge variant={variant} className="text-xs px-2 py-0.5">{label}</Badge>;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-2 md:p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">Punto de Venta</h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="new" className="gap-1" data-testid="tab-new-invoice">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva Venta</span>
            <span className="sm:hidden">Nueva</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1" data-testid="tab-invoice-list">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Facturas</span>
            <span className="sm:hidden">Lista</span>
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-1" data-testid="tab-invoice-details">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Detalles</span>
            <span className="sm:hidden">Ver</span>
          </TabsTrigger>
        </TabsList>

        {/* Nueva Venta - Estilo POS */}
        <TabsContent value="new" className="flex-1 mt-3 data-[state=active]:flex flex-col lg:flex-row gap-3">
          {/* Productos (Izquierda en desktop) */}
          <div className="flex-1 flex flex-col space-y-3">
            <Card>
              <CardContent className="p-3 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar producto..."
                    className="pl-10 h-11"
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    data-testid="input-search-product"
                  />
                </div>
                <Separator />
                <ScrollArea className="h-[calc(100vh-24rem)] lg:h-[calc(100vh-16rem)]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="group relative flex flex-col items-center justify-center p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all h-24 sm:h-28"
                        data-testid={`button-product-${product.id}`}
                      >
                        <div className="text-center">
                          <p className="font-semibold text-sm line-clamp-2 mb-1">{product.name}</p>
                          <p className="text-primary font-bold">RD$ {parseFloat(product.price.toString()).toFixed(2)}</p>
                        </div>
                        <Plus className="absolute top-1 right-1 h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Carrito (Derecha en desktop) */}
          <div className="lg:w-96 flex flex-col space-y-3">
            {/* Selector de Cliente */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <label className="text-sm font-semibold">Cliente</label>
                <Popover open={openCustomerPopover} onOpenChange={setOpenCustomerPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-11"
                      data-testid="button-select-customer"
                    >
                      {selectedCustomer ? (
                        <span className="truncate">{selectedCustomer.businessname}</span>
                      ) : (
                        <span className="text-muted-foreground">Seleccionar cliente...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Buscar cliente..." 
                        value={customerSearchTerm}
                        onValueChange={setCustomerSearchTerm}
                        data-testid="input-customer-search"
                      />
                      <CommandEmpty>No se encontraron clientes</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-y-auto">
                        {filteredCustomers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.id.toString()}
                            onSelect={(value) => {
                              const selected = customers.find(c => c.id.toString() === value);
                              if (selected) {
                                setSelectedCustomer(selected);
                                setOpenCustomerPopover(false);
                                setCustomerSearchTerm("");
                              }
                            }}
                            className="cursor-pointer"
                            data-testid={`option-customer-${customer.id}`}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{customer.businessname}</span>
                              <span className="text-xs text-muted-foreground">{customer.phone}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Mostrar saldo a favor si el cliente tiene anticipos */}
                {selectedCustomer && !isLoadingBalance && totalAdvances > 0 && (
                  <div className="mt-2 p-2 rounded-lg border bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        💰 Saldo a favor
                      </span>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        RD$ {totalAdvances.toFixed(2)}
                      </span>
                    </div>
                    {total > 0 && (
                      <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        {totalAdvances >= total ? (
                          <span>✅ El saldo cubre el total completo</span>
                        ) : (
                          <span>⚠️ Debe pagar RD$ {(total - totalAdvances).toFixed(2)}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items del Carrito */}
            <Card className="flex-1">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Carrito</label>
                  {cart.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCart}
                      className="h-7 text-xs"
                      data-testid="button-clear-cart"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Limpiar
                    </Button>
                  )}
                </div>
                <Separator />
                <ScrollArea className="h-48">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                      <p className="text-sm">Carrito vacío</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.productId} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">RD$ {item.price.toFixed(2)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              data-testid={`button-decrease-${item.productId}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              data-testid={`button-increase-${item.productId}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeFromCart(item.productId)}
                            data-testid={`button-remove-${item.productId}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Método de Pago */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <label className="text-sm font-semibold">Método de Pago</label>
                
                {/* Verificar si el saldo cubre el total */}
                {selectedCustomer && totalAdvances >= total && total > 0 ? (
                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                    <CheckCircle className="h-8 w-8 mx-auto text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      Será pagado con saldo a favor
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Saldo disponible: RD$ {totalAdvances.toFixed(2)}
                    </p>
                    {totalAdvances > total && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Quedará RD$ {(totalAdvances - total).toFixed(2)} disponible
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                        className="flex-col h-16"
                        onClick={() => setPaymentMethod('cash')}
                        data-testid="button-payment-cash"
                      >
                        <Banknote className="h-5 w-5 mb-1" />
                        <span className="text-xs">Efectivo</span>
                      </Button>
                      <Button
                        variant={paymentMethod === 'card' ? 'default' : 'outline'}
                        className="flex-col h-16"
                        onClick={() => setPaymentMethod('card')}
                        data-testid="button-payment-card"
                      >
                        <CreditCard className="h-5 w-5 mb-1" />
                        <span className="text-xs">Tarjeta</span>
                      </Button>
                      <Button
                        variant={paymentMethod === 'credit' ? 'default' : 'outline'}
                        className="flex-col h-16"
                        onClick={() => setPaymentMethod('credit')}
                        data-testid="button-payment-credit"
                      >
                        <Receipt className="h-5 w-5 mb-1" />
                        <span className="text-xs">Crédito</span>
                      </Button>
                      <Button
                        variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                        className="flex-col h-16"
                        onClick={() => setPaymentMethod('transfer')}
                        data-testid="button-payment-transfer"
                      >
                        <ArrowLeftRight className="h-5 w-5 mb-1" />
                        <span className="text-xs">Transferencia</span>
                      </Button>
                    </div>
                    {/* Mostrar monto pendiente si hay saldo insuficiente */}
                    {selectedCustomer && totalAdvances > 0 && totalAdvances < total && total > 0 && (
                      <div className="mt-2 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-center">
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                          Se aplicarán RD$ {totalAdvances.toFixed(2)} de saldo a favor
                        </p>
                        <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mt-1">
                          Debe pagar RD$ {(total - totalAdvances).toFixed(2)} con el método seleccionado
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Total y Confirmar */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>RD$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>ITBIS ({settings?.tax || 0}%):</span>
                    <span>RD$ {tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">RD$ {total.toFixed(2)}</span>
                  </div>
                </div>
                <Button
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                  onClick={() => createMutation.mutate()}
                  disabled={!selectedCustomer || cart.length === 0 || createMutation.isPending}
                  data-testid="button-create-invoice"
                >
                  {createMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </span>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Confirmar Venta
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lista de Facturas */}
        <TabsContent value="list" className="flex-1 mt-3 space-y-3">
          {/* Estadísticas */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            <Card className="bg-yellow-50 border-yellow-100">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                  <p className="text-xl font-bold text-yellow-600">{totalPendientes}</p>
                </div>
                <Clock className="h-7 w-7 text-yellow-400" />
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-100">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pagadas</p>
                  <p className="text-xl font-bold text-green-600">{totalPagadas}</p>
                </div>
                <CheckCircle className="h-7 w-7 text-green-400" />
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-100 col-span-2 lg:col-span-1">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Monto Total</p>
                  <p className="text-xl font-bold text-purple-600">RD$ {totalMonto.toFixed(2)}</p>
                </div>
                <DollarSign className="h-7 w-7 text-purple-400" />
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar factura..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-invoice"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                <ListFilter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="paid">Pagadas</SelectItem>
                <SelectItem value="partial">Parciales</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de Facturas */}
          <Card>
            <ScrollArea className="h-[calc(100vh-28rem)]">
              {/* Vista Móvil */}
              <div className="block lg:hidden p-3 space-y-3">
                {isLoadingInvoices ? (
                  <div className="text-center py-8">
                    <div className="inline-block h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay facturas
                  </div>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <Card key={invoice.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {customers.find((c) => c.id === invoice.customerId)?.businessname || "Cliente"}
                        </span>
                        <StatusBadge status={invoice.status} invoice={invoice} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Factura:</span> #{invoice.invoiceNumber || invoice.id}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span> RD$ {parseFloat(invoice.total).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewInvoiceDetails(invoice)}
                          data-testid={`button-view-invoice-${invoice.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => printInvoice(invoice)}
                          data-testid={`button-print-invoice-${invoice.id}`}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generatePDF(invoice)}
                          data-testid={`button-pdf-invoice-${invoice.id}`}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {/* Vista Desktop */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factura</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingInvoices ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="inline-block h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay facturas
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">#{invoice.invoiceNumber || invoice.id}</TableCell>
                          <TableCell>
                            {customers.find((c) => c.id === invoice.customerId)?.businessname || "Cliente"}
                          </TableCell>
                          <TableCell>
                            {format(toRD(invoice.date), 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            RD$ {parseFloat(invoice.total).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={invoice.status} invoice={invoice} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewInvoiceDetails(invoice)}
                                data-testid={`button-view-invoice-${invoice.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => printInvoice(invoice)}
                                data-testid={`button-print-invoice-${invoice.id}`}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => generatePDF(invoice)}
                                data-testid={`button-pdf-invoice-${invoice.id}`}
                              >
                                <FileDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Detalles de Factura */}
        <TabsContent value="details" className="flex-1 mt-3">
          {!selectedInvoice ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="h-16 w-16 mb-4 opacity-20" />
                <p>Seleccione una factura para ver los detalles</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Factura #{selectedInvoice.invoiceNumber || selectedInvoice.id}</h2>
                    <StatusBadge status={selectedInvoice.status} invoice={selectedInvoice} />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cliente</p>
                      <p className="font-medium">
                        {customers.find((c) => c.id === selectedInvoice.customerId)?.businessname || "Cliente"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fecha</p>
                      <p className="font-medium">
                        {format(toRD(selectedInvoice.date), 'dd/MM/yyyy', { locale: es })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Método de Pago</p>
                      <p className="font-medium capitalize">{selectedInvoice.paymentMethod}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-bold text-primary text-lg">
                        RD$ {parseFloat(selectedInvoice.total).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Productos</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cant.</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingDetails ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            <div className="inline-block h-6 w-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                          </TableCell>
                        </TableRow>
                      ) : invoiceDetails.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No hay productos
                          </TableCell>
                        </TableRow>
                      ) : (
                        invoiceDetails.map((item: any) => {
                          const product = products.find(p => p.id === item.productId);
                          return (
                            <TableRow key={item.id}>
                              <TableCell>{product?.name || "Producto"}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">RD$ {parseFloat(item.price).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">
                                RD$ {parseFloat(item.total).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  <Separator className="my-3" />
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>RD$ {parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ITBIS:</span>
                      <span>RD$ {parseFloat(selectedInvoice.tax).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">RD$ {parseFloat(selectedInvoice.total).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setActiveTab("list")}
                  data-testid="button-back-to-list"
                >
                  Volver a la Lista
                </Button>
                <Button
                  variant="outline"
                  onClick={() => printInvoice(selectedInvoice)}
                  data-testid="button-print-selected"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generatePDF(selectedInvoice)}
                  data-testid="button-pdf-selected"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
