import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type Customer, type Product, type Invoice } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { PrinterService } from "@/services/PrinterService";

// Componentes UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

import {
  Search,
  Plus,
  Eye,
  FileText,
  CheckCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  Trash,
  ListFilter,
  Printer,
  FileDown,
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
  const [activeTab, setActiveTab] = useState("list");
  const [isLoadingInvoiceDetails, setIsLoadingInvoiceDetails] = useState(false);
  
  // Función para manejar la selección de factura y mostrar detalles
  const handleViewInvoiceDetails = async (invoice: InvoiceWithDetails) => {
    if (!invoice || !invoice.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Factura inválida"
      });
      return;
    }
    
    setSelectedInvoice(invoice);
    setIsLoadingInvoiceDetails(true);
    
    try {
      console.log(`Cargando detalles para factura ID: ${invoice.id}`);
      
      // Realizar una solicitud explícita para cargar los detalles
      const response = await fetch(`/apiGET?path=/api/invoices/${invoice.id}/items`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      // Obtener los datos explícitamente para verificar
      const result = await response.json();
      
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error("Formato de respuesta inválido");
      }
      
      const items = result.data;
      console.log(`Cargados ${items.length} items para factura ${invoice.id}`);
      
      // Invalidar la consulta para actualizar el cache
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoice.id, "items"] });
      
      // Forzar una actualización de los detalles
      refetchDetails();
      
      // Cambiar a la pestaña de detalles
      setActiveTab("details");
    } catch (error) {
      console.error("Error al cargar detalles:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los detalles de la factura"
      });
    } finally {
      setIsLoadingInvoiceDetails(false);
    }
  };
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    { code: "", description: "", quantity: 0, price: 0, total: 0 },
    { code: "", description: "", quantity: 0, price: 0, total: 0 },
    { code: "", description: "", quantity: 0, price: 0, total: 0 }
  ]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'card'>('cash');

  // Consultas para obtener datos
  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    error: invoicesError
  } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"]
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"]
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"]
  });
  
  const { data: settings } = useQuery<any>({
    queryKey: ["/api/settings"]
  });

  // Consulta para obtener los items de una factura específica
  const { 
    data: invoiceDetails = [], 
    isLoading: isLoadingDetails, 
    refetch: refetchDetails,
    error: invoiceDetailsError
  } = useQuery<any[]>({
    queryKey: ["/api/invoices", selectedInvoice?.id, "items"],
    enabled: !!selectedInvoice,
    // Configurar un retry para asegurar que se carguen los datos correctamente
    retry: 3,
    retryDelay: 1000,
    staleTime: 60000 // Datos "frescos" por un minuto
  });

  // Función para agregar un nuevo producto vacío al arreglo
  const addEmptyProduct = () => {
    setOrderItems([
      ...orderItems,
      { code: "", description: "", quantity: 0, price: 0, total: 0 }
    ]);
  };

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

    // Si este es el último elemento del arreglo, agregar uno nuevo
    if (index === orderItems.length - 1) {
      addEmptyProduct();
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
    // Filtrar por término de búsqueda
    const customerName = invoice.businessName || 
      customers.find((c: any) => c.id === invoice.customerId)?.businessname || "";
    
    const matchesSearch = customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.id.toString().includes(searchQuery);

    // Filtrar por estado
    if (statusFilter === "all") return matchesSearch;
    
    // Caso especial para facturas con pago parcial
    if (statusFilter === "partial") {
      return matchesSearch && 
             invoice.status === "pending" && 
             parseFloat(invoice.totalPaid || "0") > 0 && 
             parseFloat(invoice.pendingAmount || "0") > 0;
    }
    
    return matchesSearch && invoice.status === statusFilter;
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
        notes: notes || undefined, // Si notes está vacío, lo enviamos como undefined para el esquema opcional
        // Evitamos enviar la fecha ya que el servidor la establecerá como defaultNow()
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
      setActiveTab("list");
      toast({
        title: "Éxito",
        description: "Factura creada exitosamente",
      });
      setSelectedCustomer(null);
      setNotes("");
      setOrderItems([
        { code: "", description: "", quantity: 0, price: 0, total: 0 },
        { code: "", description: "", quantity: 0, price: 0, total: 0 },
        { code: "", description: "", quantity: 0, price: 0, total: 0 }
      ]);
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

  // Mutación para eliminar items de factura
  const deleteInvoiceItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      if (!selectedInvoice) {
        throw new Error('No hay factura seleccionada');
      }
      
      const response = await apiRequest("DELETE", `/api/invoices/${selectedInvoice.id}/items/${itemId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar el item de factura');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidar la consulta de detalles de factura para actualizar la UI
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", selectedInvoice?.id, "items"] });
      // Invalidar la consulta de facturas para actualizar los totales
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      toast({
        title: "Éxito",
        description: "Item eliminado correctamente",
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
  
  // Función para manejar la eliminación de un item
  const handleDeleteInvoiceItem = (itemId: number) => {
    if (selectedInvoice?.status !== "pending") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Solo se pueden eliminar items de facturas pendientes"
      });
      return;
    }
    
    deleteInvoiceItemMutation.mutate(itemId);
  };

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

  // Funciones para imprimir y PDF
  const printInvoice = async (invoice: InvoiceWithDetails) => {
    try {
      // Mostrar mensaje de carga
      toast({
        title: "Preparando impresión",
        description: "Por favor espere...",
      });
      
      // Cargar los detalles sin cambiar el estado de selectedInvoice
      // Usamos un objeto temporal para no modificar el estado
      const tempInvoice = { ...invoice };
      
      // Esperar a que se carguen los detalles (asincrónico)
      const itemsResponse = await apiRequest("GET", `/api/invoices/${tempInvoice.id}/items`);
      if (!itemsResponse.ok) {
        throw new Error('Error al cargar detalles de la factura');
      }
      const items = await itemsResponse.json();
      
      // Usar el servicio PrinterService para imprimir
      await PrinterService.printInvoice(
        tempInvoice, 
        settings, 
        customers, 
        items
      );
    } catch (error: any) {
      console.error('Error al imprimir factura:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo imprimir la factura",
      });
    }
  };

  const generatePDF = async (invoice: InvoiceWithDetails) => {
    try {
      // Mostrar mensaje de carga
      toast({
        title: "Generando PDF",
        description: "Por favor espere...",
      });
      
      // Usamos un objeto temporal para no modificar el estado
      const tempInvoice = { ...invoice };
      
      // Obtener los detalles de la factura
      const itemsResponse = await apiRequest("GET", `/api/invoices/${tempInvoice.id}/items`);
      if (!itemsResponse.ok) {
        throw new Error('Error al cargar detalles de la factura');
      }
      const items = await itemsResponse.json();
      
      // Usar el servicio PrinterService para generar el PDF
      await PrinterService.generateInvoicePDF(
        tempInvoice, 
        settings, 
        customers, 
        items
      );
      
      toast({
        title: "¡Listo!",
        description: "PDF generado exitosamente",
      });
    } catch (error: any) {
      console.error('Error al generar PDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo generar el PDF",
      });
    }
  };

  // Calcular totales para estadísticas
  const totalPendientes = filteredInvoices.filter(i => i.status === "pending").length;
  const totalPagadas = filteredInvoices.filter(i => i.status === "paid").length;
  // Nota: Las facturas parcialmente pagadas se considerarían aún como "pending"
  const totalParciales = filteredInvoices.filter(i => 
    parseFloat(i.pendingAmount || "0") > 0 && 
    parseFloat(i.totalPaid || "0") > 0
  ).length;
  const totalMonto = filteredInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.total || "0"), 0);

  // Función para renderizar el indicador de estado
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
    
    // Para facturas con pago parcial (estado sigue siendo pending)
    if (status === "pending" && invoice && parseFloat(invoice.totalPaid || "0") > 0) {
      variant = "secondary";
      label = "Parcial";
    }
    
    return <Badge variant={variant} className="text-xs px-2 py-0.5">{label}</Badge>;
  };

  // Renderizado del componente
  return (
    <div className="p-2 md:p-4 space-y-2">
      {/* Información de depuración */}
      <div className="bg-blue-50 p-3 border border-blue-200 rounded-md mb-4">
        <h3 className="text-sm font-semibold mb-1">Información de depuración:</h3>
        <p className="text-xs">Estado de carga: {isLoadingInvoices ? "Cargando..." : "Completado"}</p>
        <p className="text-xs">Error: {invoicesError ? invoicesError.message : "Ninguno"}</p>
        <p className="text-xs">Facturas recibidas: {invoices.length}</p>
        <p className="text-xs">Facturas filtradas: {filteredInvoices.length}</p>
        <pre className="text-xs mt-2 bg-white p-2 rounded max-h-20 overflow-auto">
          {JSON.stringify(invoices.slice(0, 2), null, 2)}
        </pre>
      </div>

      {/* Cabecera con título e icono */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-lg md:text-xl font-bold">Gestión de Facturas</h1>
        </div>
        <Button 
          onClick={() => setActiveTab("new")}
          className="gap-1"
          size="sm"
        >
          <Plus className="h-3 w-3" /> Nueva Factura
        </Button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Facturas</p>
              <p className="text-lg font-bold text-blue-600">{filteredInvoices.length}</p>
            </div>
            <FileText className="h-6 w-6 text-blue-400" />
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="p-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Pendientes</p>
              <p className="text-lg font-bold text-yellow-600">{totalPendientes}</p>
            </div>
            <Clock className="h-6 w-6 text-yellow-400" />
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Pagadas</p>
              <p className="text-lg font-bold text-green-600">{totalPagadas}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-400" />
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="p-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Valor Total</p>
              <p className="text-lg font-bold text-purple-600">RD$ {totalMonto.toFixed(2)}</p>
            </div>
            <DollarSign className="h-6 w-6 text-purple-400" />
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal con pestañas */}
      <div className="bg-card rounded-lg shadow-sm border p-1">
        <Tabs 
          defaultValue="list" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-2"
        >
          <TabsList className="w-full grid grid-cols-3 h-9">
            <TabsTrigger value="list" className="flex items-center gap-1 text-xs">
              <FileText className="h-3 w-3" /> Facturas
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-1 text-xs">
              <Plus className="h-3 w-3" /> Nuevo
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-1 text-xs">
              <Eye className="h-3 w-3" /> Detalles
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Listado de Facturas */}
          <TabsContent value="list" className="space-y-2">
            <div className="flex flex-col md:flex-row gap-2 justify-between">
              <div className="relative flex-1 md:max-w-md">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar factura por cliente..."
                  className="pl-7 h-8 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs flex gap-1">
                    <ListFilter className="h-3.5 w-3.5" />
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todos los estados</SelectItem>
                    <SelectItem value="pending" className="text-xs">Pendientes</SelectItem>
                    <SelectItem value="paid" className="text-xs">Pagadas</SelectItem>
                    <SelectItem value="partial" className="text-xs">Parciales</SelectItem>
                    <SelectItem value="cancelled" className="text-xs">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border">
              <div className="relative">
                <div className="flex items-center py-2 px-3 font-medium text-xs">
                  <FileText className="mr-1 h-3.5 w-3.5 text-primary" />
                  <span>Lista de Facturas</span>
                  <Badge variant="outline" className="ml-auto text-xs py-0 px-1.5">
                    {filteredInvoices.length} facturas
                  </Badge>
                </div>
                <ScrollArea className="h-[45vh]">
                  {/* Vista para móviles (tarjetas) */}
                  <div className="block md:hidden p-2 space-y-3">
                    {invoicesError ? (
                      <div className="text-center py-6 text-red-500">
                        Error al cargar facturas: {invoicesError.message}
                      </div>
                    ) : isLoadingInvoices ? (
                      <div className="text-center py-6">
                        <svg className="animate-spin h-5 w-5 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    ) : filteredInvoices.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        No hay facturas para mostrar
                      </div>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <Card key={invoice.id} className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-sm">
                              {customers.find((c: any) => c.id === invoice.customerId)?.businessname || "Cliente"}
                            </div>
                            <StatusBadge status={invoice.status} invoice={invoice} />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-1 text-xs mb-3">
                            <div>
                              <span className="text-muted-foreground">Factura:</span> #{invoice.invoiceNumber || invoice.id}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Fecha:</span> {new Date(invoice.date).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total:</span> RD$ {parseFloat(invoice.total).toFixed(2)}
                            </div>
                            {invoice.status === "pending" && parseFloat(invoice.totalPaid || "0") > 0 && (
                              <div>
                                <span className="text-muted-foreground">Pendiente:</span> RD$ {parseFloat(invoice.pendingAmount || "0").toFixed(2)}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2 mb-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1"
                              onClick={() => handleViewInvoiceDetails(invoice)}
                              disabled={isLoadingInvoiceDetails}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> Ver Detalles
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-9 p-0"
                              onClick={() => printInvoice(invoice)}
                              title="Imprimir"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-9 p-0"
                              onClick={() => generatePDF(invoice)}
                              title="PDF"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>

                  {/* Vista para tablets y desktop (tabla tradicional) */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="py-1.5 text-xs">Cliente</TableHead>
                          <TableHead className="py-1.5 text-xs">Fecha</TableHead>
                          <TableHead className="py-1.5 text-xs">Factura No.</TableHead>
                          <TableHead className="py-1.5 text-xs">Estado</TableHead>
                          <TableHead className="py-1.5 text-xs text-right">Total</TableHead>
                          <TableHead className="py-1.5 text-xs text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                      {invoicesError ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-red-500">
                            Error al cargar facturas: {invoicesError.message}
                          </TableCell>
                        </TableRow>
                      ) : isLoadingInvoices ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent"></div>
                              <span>Cargando facturas...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            No se encontraron facturas
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInvoices.map((invoice) => (
                          <TableRow key={invoice.id} className="hover:bg-muted/50">
                            <TableCell className="py-1">
                              <div className="font-medium text-xs">
                                {invoice.businessName || 
                                  customers.find((c: any) => c.id === invoice.customerId)?.businessname ||
                                  "Cliente"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {invoice.totalPaid && invoice.total && 
                                  (parseFloat(invoice.totalPaid) >= parseFloat(invoice.total) 
                                    ? "Pagada Completamente" 
                                    : `Pendiente: ${parseFloat(invoice.pendingAmount || "0").toFixed(2)}`
                                  )
                                }
                              </div>
                            </TableCell>
                            <TableCell className="py-1 text-xs">
                              {new Date(invoice.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="py-1 text-xs">
                              {invoice.id}
                            </TableCell>
                            <TableCell className="py-1">
                              <StatusBadge status={invoice.status} invoice={invoice} />
                            </TableCell>
                            <TableCell className="py-1 text-right text-xs font-medium">
                              {parseFloat(invoice.total).toFixed(2)}
                            </TableCell>
                            <TableCell className="py-1 text-right">
                              <div className="flex justify-end space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => printInvoice(invoice)}
                                  title="Imprimir factura"
                                >
                                  <Printer className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => generatePDF(invoice)}
                                  title="Generar PDF"
                                >
                                  <FileDown className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleViewInvoiceDetails(invoice)}
                                  disabled={isLoadingInvoiceDetails}
                                  title="Ver detalles"
                                >
                                  <Eye className="h-3 w-3" />
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
              </div>
            </div>
          </TabsContent>

          {/* Pestaña de Nueva Factura */}
          <TabsContent value="new" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Nueva Factura
              </h1>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("list")}
                className="w-full sm:w-auto"
              >
                Volver a la Lista
              </Button>
            </div>

            {/* Formulario */}
            <Card className="p-3 sm:p-4">
              <CardContent className="p-0 space-y-4">
                {/* Cliente */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Datos del Cliente</div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Seleccione un Cliente</label>
                      <Select
                        onValueChange={(value) => {
                          const customer = customers.find((c: any) => c.id === parseInt(value));
                          setSelectedCustomer(customer || null);
                        }}
                      >
                        <SelectTrigger className="h-9 text-sm w-full">
                          <SelectValue placeholder="Seleccionar Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer: any) => (
                            <SelectItem
                              key={customer.id}
                              value={customer.id.toString()}
                              className="text-sm"
                            >
                              {customer.businessname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedCustomer && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-muted/30 rounded-lg p-3">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground">Nombre del Gerente</div>
                          <div className="text-sm">{selectedCustomer.managername}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-muted-foreground">Dirección</div>
                          <div className="text-sm">{selectedCustomer.street} {selectedCustomer.streetnumber}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-muted-foreground">Teléfono</div>
                          <div className="text-sm">{selectedCustomer.phone}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Método de Pago */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Método de Pago</div>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <Button
                      type="button"
                      variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('cash')}
                      className="flex-1"
                    >
                      Efectivo
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMethod === 'credit' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('credit')}
                      className="flex-1"
                    >
                      Crédito
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMethod === 'card' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentMethod('card')}
                      className="flex-1"
                    >
                      Tarjeta
                    </Button>
                  </div>
                </div>

                {/* Productos - Vista Móvil */}
                <div className="space-y-2 block md:hidden">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">Productos</div>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={addEmptyProduct}
                      className="h-7 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar producto
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {orderItems.map((item, index) => (
                      <Card key={index} className="p-3">
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Producto</label>
                            <Select
                              value={item.code}
                              onValueChange={(value) => handleProductChange(index, value)}
                            >
                              <SelectTrigger className="h-9 text-sm w-full">
                                <SelectValue placeholder="Seleccionar Producto" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product: Product) => (
                                  <SelectItem
                                    key={product.id}
                                    value={product.id.toString()}
                                    className="text-sm"
                                  >
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {item.description && (
                            <div className="text-sm">{item.description}</div>
                          )}
                          
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Cantidad</label>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                                className="h-9"
                                min="0"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Precio</label>
                              <div className="h-9 flex items-center text-sm">
                                {item.price.toFixed(2)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Total</label>
                              <div className="h-9 flex items-center font-medium text-sm">
                                {item.total.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Productos - Vista Desktop */}
                <div className="space-y-2 hidden md:block">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">Productos</div>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={addEmptyProduct}
                      className="h-7 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar producto
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="py-2 w-[200px]">Producto</TableHead>
                          <TableHead className="py-2">Descripción</TableHead>
                          <TableHead className="py-2 w-[80px] text-right">Cant.</TableHead>
                          <TableHead className="py-2 w-[100px] text-right">Precio</TableHead>
                          <TableHead className="py-2 w-[100px] text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="p-2">
                              <Select
                                value={item.code}
                                onValueChange={(value) => handleProductChange(index, value)}
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product: Product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id.toString()}
                                      className="text-sm"
                                    >
                                      {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm p-2">{item.description}</TableCell>
                            <TableCell className="p-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                                className="h-9 text-sm text-right"
                                min="0"
                              />
                            </TableCell>
                            <TableCell className="text-right text-sm p-2">
                              {item.price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-sm p-2 font-medium">
                              {item.total.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Campo de Notas */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Notas de la Factura</div>
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

                {/* Totales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div></div>
                  <div className="space-y-1.5 p-3 bg-muted/30 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>RD$ {calculateTotal().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>ITBIS (18%):</span>
                      <span>RD$ {calculateTotal().tax.toFixed(2)}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total:</span>
                      <span>RD$ {calculateTotal().total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setActiveTab("list")}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Detalles */}
          <TabsContent value="details" className="space-y-3 sm:space-y-4">
            {selectedInvoice ? (
              <>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                  <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Factura #{selectedInvoice.invoiceNumber}
                  </h1>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("list")}
                    className="w-full sm:w-auto"
                  >
                    Volver a la Lista
                  </Button>
                </div>

                <Card className="p-3 sm:p-4">
                  <CardContent className="p-0 space-y-4">
                    {/* Información básica de la factura */}
                    <div className="bg-muted/30 rounded-lg p-3 sm:p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground">Cliente</div>
                          <div className="font-medium text-sm">
                            {selectedInvoice.businessName || 
                              customers.find((c: any) => c.id === selectedInvoice.customerId)?.businessname || 
                              "Cliente"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-muted-foreground">Fecha</div>
                          <div className="text-sm">{new Date(selectedInvoice.date).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-muted-foreground">Estado</div>
                          <div>
                            <StatusBadge status={selectedInvoice.status} invoice={selectedInvoice} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sección de notas */}
                    <div className="space-y-1 sm:space-y-2">
                      <div className="text-sm font-medium">Notas</div>
                      <p className="text-sm bg-muted/20 rounded-lg p-2">{selectedInvoice.notes || "Sin notas"}</p>
                    </div>

                    {/* Productos - Vista Móvil */}
                    <div className="space-y-2 block md:hidden">
                      <div className="text-sm font-medium">Detalles de Productos</div>
                      {invoiceDetails.length === 0 ? (
                        <div className="py-4 text-center">No hay detalles disponibles</div>
                      ) : (
                        <div className="space-y-3">
                          {isLoadingDetails ? (
                            // Mostrar un estado de carga para mejorar la experiencia de usuario
                            <div className="space-y-2 p-4">
                              <div className="h-6 bg-gray-200 rounded animate-pulse mb-3"></div>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                              </div>
                            </div>
                          ) : Array.isArray(invoiceDetails) && invoiceDetails.length > 0 ? (
                            // Mostrar los detalles de la factura si hay datos
                            invoiceDetails.map((item: any) => (
                              <Card key={item.id} className="p-3 mb-2">
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <div className="font-medium">
                                      {item.productName || products.find((p: Product) => p.id === item.productId)?.name || "Producto"}
                                    </div>
                                    {selectedInvoice?.status === "pending" && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7" 
                                        onClick={() => handleDeleteInvoiceItem(item.id)}
                                      >
                                        <Trash className="h-4 w-4 text-destructive" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <div className="text-xs text-muted-foreground">Cantidad</div>
                                      <div>{item.quantity}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground">Precio</div>
                                      <div>RD$ {parseFloat(item.price).toFixed(2)}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground">Total</div>
                                      <div className="font-medium">RD$ {parseFloat(item.total).toFixed(2)}</div>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            ))
                          ) : (
                            // Mensaje si no hay items
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                              <p className="text-muted-foreground">No hay productos en esta factura</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Productos - Vista Desktop */}
                    <div className="space-y-2 hidden md:block">
                      <div className="text-sm font-medium">Detalles de Productos</div>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="py-2">Producto</TableHead>
                              <TableHead className="py-2 text-right">Cantidad</TableHead>
                              <TableHead className="py-2 text-right">Precio</TableHead>
                              <TableHead className="py-2 text-right">Total</TableHead>
                              <TableHead className="py-2 w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoiceDetails.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center p-3">
                                  No hay detalles disponibles
                                </TableCell>
                              </TableRow>
                            ) : (
                              Array.isArray(invoiceDetails) && invoiceDetails.map((item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell className="p-2">
                                    {item.productName || products.find((p: Product) => p.id === item.productId)?.name || "Producto"}
                                  </TableCell>
                                  <TableCell className="text-right p-2">{item.quantity}</TableCell>
                                  <TableCell className="text-right p-2">RD$ {parseFloat(item.price).toFixed(2)}</TableCell>
                                  <TableCell className="text-right font-medium p-2">RD$ {parseFloat(item.total).toFixed(2)}</TableCell>
                                  <TableCell className="p-2 text-right">
                                    {selectedInvoice?.status === "pending" && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7" 
                                        onClick={() => handleDeleteInvoiceItem(item.id)}
                                      >
                                        <Trash className="h-4 w-4 text-destructive" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Totales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div></div>
                      <div className="space-y-1.5 p-3 bg-muted/30 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span>Total:</span>
                          <span className="font-medium">RD$ {parseFloat(selectedInvoice.total).toFixed(2)}</span>
                        </div>
                        {selectedInvoice.totalPaid && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span>Pagado:</span>
                              <span className="font-medium">RD$ {parseFloat(selectedInvoice.totalPaid).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Pendiente:</span>
                              <span className="font-medium">RD$ {parseFloat(selectedInvoice.pendingAmount || "0").toFixed(2)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Procesar Pago */}
                    {selectedInvoice.status !== "paid" && (
                      <div className="space-y-2 border rounded-lg p-3 sm:p-4 mt-4">
                        <h3 className="font-medium">Registrar Pago</h3>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            type="number"
                            placeholder="Monto a pagar"
                            className="w-full sm:max-w-xs"
                            min="0"
                            step="0.01"
                            id="paymentAmount"
                          />
                          <Button
                            className="w-full sm:w-auto"
                            onClick={() => {
                              const amountInput = document.getElementById("paymentAmount") as HTMLInputElement;
                              handlePayment(selectedInvoice, amountInput.value);
                            }}
                            disabled={createPaymentMutation.isPending}
                          >
                            {createPaymentMutation.isPending ? (
                              <>
                                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                                Procesando...
                              </>
                            ) : (
                              "Procesar Pago"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No hay factura seleccionada</p>
                  <p className="text-sm text-muted-foreground mb-4">Seleccione una factura de la lista para ver sus detalles</p>
                  <Button onClick={() => setActiveTab("list")}>
                    Ir a la lista de facturas
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}