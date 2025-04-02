import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Payment, type Invoice } from "@shared/schema";
import { Link } from "wouter";

// Extender el tipo Invoice para incluir campos adicionales del endpoint
interface InvoiceWithDetails extends Invoice {
  businessName?: string;
  totalPaid?: string;
  pendingAmount?: string;
}
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
  CardDescription
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Search, 
  ArrowUpDown, 
  Calendar, 
  CreditCard, 
  DollarSign,
  Filter,
  X,
  CircleDollarSign,
  CheckCircle,
  ArrowRight,
  AlertCircle,
  Wallet
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Extender el tipo Payment para incluir los campos adicionales
type PaymentWithCustomer = Payment & {
  customerName: string;
  invoiceNumber: string;
  method?: string; // Alias para paymentMethod
  paymentMethod?: string; // Campo real usado por el servidor
};

// Tipo para las estadísticas de pagos
interface PaymentsStats {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  pendingAmount: number;
}

export default function Payments() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("list");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  // Fetch payments data
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<PaymentWithCustomer[]>({
    queryKey: ["/api/payments"],
  });

  // Fetch invoices with pending payments
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices/pending"],
  });

  // Sort payments by date
  const sortedPayments = useMemo(() => {
    if (!payments) return [];
    
    let filtered = [...payments];
    
    // Aplicar filtros de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        payment => 
          payment.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.invoiceNumber?.includes(searchTerm) ||
          payment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, searchTerm]);

  // Calcular las estadísticas de pagos
  const paymentsStats: PaymentsStats = useMemo(() => {
    if (!payments || payments.length === 0) {
      return {
        totalToday: 0,
        totalWeek: 0,
        totalMonth: 0,
        pendingAmount: 0
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    return {
      totalToday: payments
        .filter(payment => new Date(payment.date) >= today)
        .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0),
      totalWeek: payments
        .filter(payment => new Date(payment.date) >= oneWeekAgo)
        .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0),
      totalMonth: payments
        .filter(payment => new Date(payment.date) >= oneMonthAgo)
        .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0),
      pendingAmount: (invoices || [])
        .reduce((sum, invoice) => sum + parseFloat(invoice.pendingAmount?.toString() || "0"), 0)
    };
  }, [payments, invoices]);

  // Mutation para crear un nuevo pago
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      return await apiRequest("/api/payments", "POST", paymentData);
    },
    onSuccess: () => {
      toast({
        title: "Pago registrado",
        description: "El pago ha sido registrado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/pending"] });
      setActiveTab("list");
      resetPaymentForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar el pago",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Función para manejar la creación de un pago
  const handleCreatePayment = () => {
    if (!selectedInvoice) {
      toast({
        title: "Error al registrar el pago",
        description: "Debes seleccionar una factura",
        variant: "destructive",
      });
      return;
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Error al registrar el pago",
        description: "El monto del pago debe ser mayor a cero",
        variant: "destructive",
      });
      return;
    }

    // Verificar que el monto no supere el pendiente
    const pendingAmount = parseFloat(selectedInvoice.pendingAmount || selectedInvoice.total);
    if (parseFloat(paymentAmount) > pendingAmount) {
      toast({
        title: "Error al registrar el pago",
        description: "El monto del pago no puede ser mayor al pendiente",
        variant: "destructive",
      });
      return;
    }

    const paymentData = {
      invoiceId: selectedInvoice.id,
      customerId: selectedInvoice.customerId,
      amount: paymentAmount,
      paymentMethod: paymentMethod, // Usamos paymentMethod para cumplir con el esquema del servidor
      notes: paymentNotes || undefined
    };

    createPaymentMutation.mutate(paymentData);
  };

  // Restablecer el formulario de pago
  const resetPaymentForm = () => {
    setSelectedInvoice(null);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentNotes("");
  };

  // Formatear montos
  const formatCurrency = (amount: number | string) => {
    return `RD$ ${parseFloat(amount.toString()).toFixed(2)}`;
  };

  // Renderizar un badge de estado según el método de pago
  const PaymentMethodBadge = ({ method }: { method?: string }) => {
    let variant: "outline" | "default" | "secondary" = "outline";
    let label = "Desconocido";
    
    // Asegurarnos de que siempre tenemos un método válido
    const paymentMethod = method || "cash";

    if (paymentMethod === "cash") {
      variant = "default";
      label = "Efectivo";
    } else if (paymentMethod === "card") {
      variant = "secondary";
      label = "Tarjeta";
    } else if (paymentMethod === "transfer") {
      variant = "outline";
      label = "Transferencia";
    }

    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-yellow-400" />
            Gestión de Pagos
          </h1>
        </div>

        {/* Resumen de Pagos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pagos Hoy</p>
                <p className="text-lg font-bold">{formatCurrency(paymentsStats.totalToday)}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pagos Esta Semana</p>
                <p className="text-lg font-bold">{formatCurrency(paymentsStats.totalWeek)}</p>
              </div>
              <CreditCard className="h-8 w-8 text-green-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pagos Este Mes</p>
                <p className="text-lg font-bold">{formatCurrency(paymentsStats.totalMonth)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Monto Pendiente</p>
                <p className="text-lg font-bold">{formatCurrency(paymentsStats.pendingAmount)}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-purple-400" />
            </CardContent>
          </Card>
        </div>

        {/* Pestañas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="list" className="text-xs">Historial de Pagos</TabsTrigger>
            <TabsTrigger value="new" className="text-xs">Registrar Pago</TabsTrigger>
          </TabsList>

          {/* Pestaña de Lista de Pagos */}
          <TabsContent value="list" className="space-y-2">
            <Card>
              <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                    Historial de Pagos
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Link href="/payments/history">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 text-xs"
                      >
                        Ver Historial Detallado
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => setActiveTab("new")}
                    >
                      Registrar Nuevo Pago
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  Consulta todos los pagos registrados en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                {/* Filtros y Búsqueda */}
                <div className="flex flex-col md:flex-row gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por cliente, factura o notas"
                      className="pl-8 h-8 text-xs"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                        onClick={() => setSearchTerm("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tabla de Pagos */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="text-[10px]">
                        <TableHead className="py-1 w-[180px]">Cliente</TableHead>
                        <TableHead className="py-1 w-[100px]">Fecha</TableHead>
                        <TableHead className="py-1 w-[100px]">Factura</TableHead>
                        <TableHead className="py-1 w-[80px]">Método</TableHead>
                        <TableHead className="py-1">Notas</TableHead>
                        <TableHead className="py-1 w-[100px] text-right">Monto</TableHead>
                        <TableHead className="py-1 w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingPayments ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground">
                            Cargando pagos...
                          </TableCell>
                        </TableRow>
                      ) : sortedPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground">
                            No hay pagos registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedPayments.map((payment) => (
                          <TableRow key={payment.id} className="text-xs">
                            <TableCell className="py-1.5 font-medium">{payment.customerName || '-'}</TableCell>
                            <TableCell className="py-1.5">
                              {new Date(payment.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="py-1.5">#{payment.invoiceNumber}</TableCell>
                            <TableCell className="py-1.5">
                              <PaymentMethodBadge method={payment.method || payment.paymentMethod} />
                            </TableCell>
                            <TableCell className="py-1.5 truncate max-w-[150px]">{payment.notes || "-"}</TableCell>
                            <TableCell className="py-1.5 text-right font-semibold">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <FileText className="h-3 w-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Detalles del Pago</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-3 text-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="bg-muted/30 rounded p-2">
                                        <p className="text-xs text-muted-foreground">Factura No.</p>
                                        <p className="font-medium">#{payment.invoiceNumber}</p>
                                      </div>
                                      <div className="bg-muted/30 rounded p-2">
                                        <p className="text-xs text-muted-foreground">Cliente</p>
                                        <p className="font-medium">{payment.customerName}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="bg-muted/30 rounded p-2">
                                        <p className="text-xs text-muted-foreground">Monto</p>
                                        <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                                      </div>
                                      <div className="bg-muted/30 rounded p-2">
                                        <p className="text-xs text-muted-foreground">Método de Pago</p>
                                        <p className="font-medium">
                                          <PaymentMethodBadge method={payment.method || payment.paymentMethod} />
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-muted/30 rounded p-2">
                                      <p className="text-xs text-muted-foreground">Fecha</p>
                                      <p className="font-medium">{new Date(payment.date).toLocaleDateString()} {new Date(payment.date).toLocaleTimeString()}</p>
                                    </div>
                                    
                                    {payment.notes && (
                                      <div className="bg-muted/30 rounded p-2">
                                        <p className="text-xs text-muted-foreground">Notas</p>
                                        <p>{payment.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Registrar Pago */}
          <TabsContent value="new" className="space-y-2">
            <Card>
              <CardHeader className="p-3">
                <div className="flex items-center gap-1">
                  <CircleDollarSign className="h-4 w-4 text-green-400" />
                  <CardTitle className="text-base">Registrar Pago</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Registra un nuevo pago para una factura pendiente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {/* Formulario de Pago */}
                <div className="space-y-2">
                  {/* Seleccionar Factura */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Factura</label>
                    <Select
                      onValueChange={(value) => {
                        const invoice = invoices.find((inv) => inv.id === parseInt(value));
                        setSelectedInvoice(invoice || null);
                        
                        // Si la factura tiene un monto pendiente, pre-llenamos el campo del monto con ese valor
                        if (invoice && invoice.pendingAmount) {
                          setPaymentAmount(invoice.pendingAmount);
                        } else if (invoice) {
                          setPaymentAmount(invoice.total);
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Seleccionar factura pendiente" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingInvoices ? (
                          <SelectItem value="loading" disabled>Cargando facturas...</SelectItem>
                        ) : invoices.length === 0 ? (
                          <SelectItem value="none" disabled>No hay facturas pendientes</SelectItem>
                        ) : (
                          invoices.map((invoice) => (
                            <SelectItem
                              key={invoice.id}
                              value={invoice.id.toString()}
                              className="text-xs py-1"
                            >
                              #{invoice.id} - {invoice.businessName || 'Cliente'} - {formatCurrency(invoice.pendingAmount || invoice.total)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Detalles de la Factura Seleccionada */}
                  {selectedInvoice && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="bg-muted/30 rounded p-1.5">
                        <div className="text-[10px] font-medium text-muted-foreground">Cliente</div>
                        <div className="text-xs">{selectedInvoice.businessName || 'Cliente'}</div>
                      </div>
                      <div className="bg-muted/30 rounded p-1.5">
                        <div className="text-[10px] font-medium text-muted-foreground">Fecha de Factura</div>
                        <div className="text-xs">{new Date(selectedInvoice.date).toLocaleDateString()}</div>
                      </div>
                      <div className="bg-muted/30 rounded p-1.5">
                        <div className="text-[10px] font-medium text-muted-foreground">Total Factura</div>
                        <div className="text-xs">{formatCurrency(selectedInvoice.total)}</div>
                      </div>
                      
                      {selectedInvoice.pendingAmount && (
                        <div className="bg-muted/30 rounded p-1.5 md:col-span-3">
                          <div className="text-[10px] font-medium text-muted-foreground">Monto Pendiente</div>
                          <div className="text-xs font-semibold">{formatCurrency(selectedInvoice.pendingAmount)}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Método de Pago */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Método de Pago</label>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('cash')}
                        className="text-xs h-6 flex-1"
                      >
                        Efectivo
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMethod === 'card' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('card')}
                        className="text-xs h-6 flex-1"
                      >
                        Tarjeta
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('transfer')}
                        className="text-xs h-6 flex-1"
                      >
                        Transferencia
                      </Button>
                    </div>
                  </div>

                  {/* Monto de Pago */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Monto a Pagar</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                        RD$
                      </span>
                      <Input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-10 h-7 text-xs"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Notas */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Notas</label>
                    <Textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Añadir notas al pago (opcional)"
                      className="h-16 text-xs resize-none"
                    />
                  </div>

                  {/* Botones */}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setActiveTab("list")}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleCreatePayment}
                      disabled={createPaymentMutation.isPending || !selectedInvoice}
                    >
                      {createPaymentMutation.isPending ? (
                        <>
                          <div className="animate-spin mr-1 h-3 w-3 border-2 border-current border-t-transparent rounded-full"></div>
                          Procesando...
                        </>
                      ) : (
                        "Registrar Pago"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}