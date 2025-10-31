import { useTranslation } from "react-i18next";
import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useLocation } from "wouter";
import { PrinterService, DocumentType } from "@/services/PrinterService";
import { formatDateRD } from "@/lib/date-utils";
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Search, 
  Filter,
  CreditCard,
  DollarSign,
  FileText,
  Calendar,
  Wallet,
  AlertCircle,
  DownloadCloud,
  Printer,
  ArrowLeft,
  FileDown
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";

// Tipo para los pagos con detalles adicionales
interface PaymentWithDetails {
  id: number;
  invoiceId: number | null;
  invoiceNumber: string | null;
  customerId: number;
  customerName: string;
  amount: string;
  method: "cash" | "credit" | "card" | "transfer";
  date: string;
  reference?: string;
  notes?: string;
  isAdvance?: boolean;
  documentNumber?: string | null;
}

// Tipo para las estadísticas de pago
interface PaymentsStats {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  totalAmount: number;
  totalCount: number;
  methodStats: {
    cash: number;
    credit: number;
    card: number;
    transfer: number;
  };
}

export default function PaymentsHistory() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});
  const [filters, setFilters] = useState({
    method: "all" as "all" | "cash" | "credit" | "card" | "transfer",
    customer: "",
    type: "all" as "all" | "advance" | "regular", // Filtro para anticipos vs pagos regulares
  });

  // Cargar pagos
  const { data: payments, isLoading, refetch } = useQuery<PaymentWithDetails[]>({
    queryKey: ["/api/payments"],
    enabled: true,
  });

  // Aplicar filtros y búsqueda a los pagos
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    
    let result = [...payments];
    
    // Filtrar por método de pago
    if (filters.method && filters.method !== 'all') {
      result = result.filter(payment => payment.method === filters.method);
    }
    
    // Filtrar por tipo de pago (anticipo vs regular)
    if (filters.type && filters.type !== 'all') {
      if (filters.type === 'advance') {
        result = result.filter(payment => payment.isAdvance === true);
      } else if (filters.type === 'regular') {
        result = result.filter(payment => !payment.isAdvance);
      }
    }
    
    // Filtrar por rango de fecha
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      result = result.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= fromDate;
      });
    }
    
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      
      result = result.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate <= toDate;
      });
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        payment =>
          payment.customerName.toLowerCase().includes(term) ||
          (payment.invoiceNumber && payment.invoiceNumber.includes(term)) ||
          (payment.documentNumber && payment.documentNumber.toLowerCase().includes(term)) ||
          (payment.notes && payment.notes.toLowerCase().includes(term))
      );
    }
    
    // Filtrar por pestaña activa
    if (activeTab === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      result = result.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= today;
      });
    } else if (activeTab === "week") {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      result = result.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= weekStart;
      });
    } else if (activeTab === "month") {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      result = result.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= monthStart;
      });
    }
    
    // Organizar por fecha (más recientes primero)
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, searchTerm, filters, dateRange, activeTab]);

  // Calcular estadísticas de pagos
  const paymentsStats: PaymentsStats = useMemo(() => {
    if (!payments || payments.length === 0) {
      return {
        totalToday: 0,
        totalWeek: 0,
        totalMonth: 0,
        totalAmount: 0,
        totalCount: 0,
        methodStats: {
          cash: 0,
          credit: 0,
          card: 0,
          transfer: 0
        }
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    let totalToday = 0;
    let totalWeek = 0;
    let totalMonth = 0;
    let totalAmount = 0;
    let methodStats = {
      cash: 0,
      credit: 0,
      card: 0,
      transfer: 0
    };
    
    // Calcular estadísticas de tiempo basadas en pagos filtrados
    filteredPayments.forEach(payment => {
      const paymentDate = new Date(payment.date);
      const amount = parseFloat(payment.amount);
      totalAmount += amount;
      
      if (paymentDate >= today) {
        totalToday += amount;
      }
      
      if (paymentDate >= weekStart) {
        totalWeek += amount;
      }
      
      if (paymentDate >= monthStart) {
        totalMonth += amount;
      }
    });
    
    // Calcular estadísticas por método de TODOS los pagos (sin filtros)
    payments.forEach(payment => {
      const amount = parseFloat(payment.amount);
      
      if (payment.method === 'cash') {
        methodStats.cash += amount;
      } else if (payment.method === 'credit') {
        methodStats.credit += amount;
      } else if (payment.method === 'card') {
        methodStats.card += amount;
      } else if (payment.method === 'transfer') {
        methodStats.transfer += amount;
      }
    });
    
    return {
      totalToday,
      totalWeek,
      totalMonth,
      totalAmount,
      totalCount: filteredPayments.length,
      methodStats
    };
  }, [filteredPayments, payments]);

  // Función para formatear moneda
  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 2
    }).format(numValue);
  };

  // Componente para mostrar el método de pago con un badge
  const PaymentMethodBadge = ({ method }: { method: string }) => {
    let variant: "default" | "secondary" | "outline" | "destructive" = "default";
    let label = method;

    if (method === "cash") {
      variant = "default";
      label = "Efectivo";
    } else if (method === "card") {
      variant = "secondary";
      label = "Tarjeta";
    } else if (method === "credit") {
      variant = "outline";
      label = "Crédito";
    } else if (method === "transfer") {
      variant = "outline";
      label = "Transferencia";
    }

    return <Badge variant={variant}>{label}</Badge>;
  };

  // Función segura para imprimir recibo individual de pago o anticipo usando PrinterService
  const printPaymentReceipt = async (payment: PaymentWithDetails) => {
    try {
      // Obtener configuración de la empresa
      const settingsResponse = await fetch('/api/settings');
      const settings = await settingsResponse.json();
      
      // Preparar datos del pago para el servicio de impresión
      const paymentData = {
        id: payment.id,
        date: payment.date,
        amount: payment.amount,
        method: payment.method,
        paymentMethod: payment.method,
        customerName: payment.customerName,
        invoiceNumber: payment.invoiceNumber,
        documentNumber: payment.documentNumber,
        isAdvance: payment.isAdvance,
        reference: payment.reference,
        notes: payment.notes,
      };
      
      // Generar nombre del archivo
      const docIdentifier = payment.isAdvance 
        ? payment.documentNumber || `anticipo-${payment.id}`
        : `pago-factura-${payment.invoiceNumber}`;
      const fileName = `recibo_${docIdentifier}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      // Generar PDF usando el servicio centralizado
      await PrinterService.generatePDFDirect(
        paymentData,
        DocumentType.PAYMENT_RECEIPT,
        {
          title: payment.isAdvance ? "Recibo de Anticipo" : "Recibo de Pago",
          fileName,
          size: [80, 297] // 80mm ancho, altura auto
        },
        {
          settings,
        }
      );
      
    } catch (error: any) {
      console.error('Error al generar recibo:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el recibo",
      });
    }
  };
  
  // Referencia al contenido que se va a imprimir
  const printContentRef = useRef<HTMLDivElement>(null);
  
  // Función para imprimir la lista de pagos usando PrinterService
  const handlePrint = async () => {
    try {
      // Verificar que tenemos el contenido a imprimir
      if (!printContentRef.current) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se puede generar la impresión",
        });
        return;
      }
      
      // Usar PrinterService para imprimir el contenido referenciado
      await PrinterService.printDocument(printContentRef.current, {
        title: "Historial de Pagos",
        size: [210, 297], // A4 - tamaño en mm
        margins: [10, 10, 10, 10] // márgenes en mm [top, right, bottom, left]
      });
      
    } catch (error: any) {
      console.error('Error en handlePrint:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo imprimir el documento",
      });
    }
  };
  
  // Función para generar PDF del historial de pagos
  const handleGeneratePDF = async () => {
    try {
      // Verificar que tenemos los datos necesarios
      if (!filteredPayments || filteredPayments.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No hay datos para generar el PDF",
        });
        return;
      }
      
      // Usar el servicio para generar PDF
      const paymentData = {
        title: "Historial de Pagos",
        date: new Date().toISOString(),
        totalAmount: paymentsStats.totalAmount,
        totalCount: paymentsStats.totalCount
      };
      
      const fileName = `pagos_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      // Generar PDF usando el servicio centralizado
      await PrinterService.generatePDFDirect(
        paymentData,
        DocumentType.PAYMENT,
        {
          title: "Historial de Pagos",
          fileName,
          size: [210, 297] // A4
        },
        {
          items: filteredPayments
        }
      );
      
    } catch (error: any) {
      console.error('Error en handleGeneratePDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo generar el PDF",
      });
    }
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 pb-16">
      {/* Contenido imprimible (oculto) */}
      <div ref={printContentRef} className="hidden">
        <div style={{padding: "20px"}}>
          <h1 style={{textAlign: "center", fontSize: "18px", marginBottom: "10px"}}>Historial de Pagos</h1>
          <p style={{textAlign: "center", marginBottom: "20px"}}>Total: {formatCurrency(paymentsStats.totalAmount)} - {paymentsStats.totalCount} transacciones</p>
          
          <table style={{width: "100%", borderCollapse: "collapse"}}>
            <thead>
              <tr style={{backgroundColor: "#f3f4f6"}}>
                <th style={{textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd"}}>Fecha</th>
                <th style={{textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd"}}>Cliente</th>
                <th style={{textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd"}}>Documento</th>
                <th style={{textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd"}}>Tipo</th>
                <th style={{textAlign: "left", padding: "8px", borderBottom: "1px solid #ddd"}}>Método</th>
                <th style={{textAlign: "right", padding: "8px", borderBottom: "1px solid #ddd"}}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => (
                <tr key={payment.id} style={{borderBottom: "1px solid #eee"}}>
                  <td style={{padding: "8px"}}>{formatDateRD(payment.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                  <td style={{padding: "8px"}}>{payment.customerName}</td>
                  <td style={{padding: "8px"}}>
                    {payment.isAdvance 
                      ? payment.documentNumber || '-'
                      : `#${payment.invoiceNumber}`}
                  </td>
                  <td style={{padding: "8px"}}>
                    {payment.isAdvance ? 'Anticipo' : 'Pago Regular'}
                  </td>
                  <td style={{padding: "8px"}}>
                    {payment.method === 'cash' ? 'Efectivo' :
                    payment.method === 'card' ? 'Tarjeta' :
                    payment.method === 'credit' ? 'Crédito' :
                    payment.method === 'transfer' ? 'Transferencia' : 'Otro'}
                  </td>
                  <td style={{padding: "8px", textAlign: "right"}}>{formatCurrency(payment.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex flex-col space-y-4">
        {/* Encabezado con título y estadísticas */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 flex items-center gap-1.5"
              onClick={() => setLocation("/payments")}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Volver</span>
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Historial de Pagos
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1 text-xs"
              onClick={() => {
                // Implementar la función de exportar datos
                toast({
                  title: "Exportando datos",
                  description: "Los datos se están exportando...",
                });
              }}
            >
              <DownloadCloud className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1 text-xs"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1 text-xs"
              onClick={handleGeneratePDF}
            >
              <FileDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="flex items-center gap-1 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
          </div>
        </div>

        {/* Resumen de estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
          <Card className="bg-muted/20">
            <CardContent className="p-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Total Pagos</p>
                  <p className="text-sm sm:text-lg font-bold">{formatCurrency(paymentsStats.totalAmount)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 text-blue-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{paymentsStats.totalCount} transacciones</p>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground mb-2">Por Método</p>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[11px]">Efectivo:</span>
                  <span className="text-[11px] font-semibold">{formatCurrency(paymentsStats.methodStats.cash)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px]">Crédito:</span>
                  <span className="text-[11px] font-semibold">{formatCurrency(paymentsStats.methodStats.credit)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px]">Tarjeta:</span>
                  <span className="text-[11px] font-semibold">{formatCurrency(paymentsStats.methodStats.card)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px]">Transfer.:</span>
                  <span className="text-[11px] font-semibold">{formatCurrency(paymentsStats.methodStats.transfer)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Esta Semana</p>
                  <p className="text-sm sm:text-lg font-bold">{formatCurrency(paymentsStats.totalWeek)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-yellow-500" />
                </div>
              </div>
              <div className="h-1.5 w-full bg-muted mt-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 rounded-full" 
                  style={{ 
                    width: paymentsStats.totalAmount > 0 
                      ? `${Math.min(100, (paymentsStats.totalWeek / paymentsStats.totalAmount) * 100)}%` 
                      : '0%' 
                  }}
                ></div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Hoy</p>
                  <p className="text-sm sm:text-lg font-bold">{formatCurrency(paymentsStats.totalToday)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 sm:h-7 sm:w-7 text-purple-500" />
                </div>
              </div>
              <div className="h-1.5 w-full bg-muted mt-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full" 
                  style={{ 
                    width: paymentsStats.totalWeek > 0 
                      ? `${Math.min(100, (paymentsStats.totalToday / paymentsStats.totalWeek) * 100)}%` 
                      : '0%' 
                  }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y opciones */}
        <div className="flex flex-col gap-2">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-4 h-9">
              <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
              <TabsTrigger value="today" className="text-xs">Hoy</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Semana</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">Mes</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pagos..."
                className="pl-8 h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select
              value={filters.method}
              onValueChange={(value) => setFilters({...filters, method: value as any})}
            >
              <SelectTrigger className="w-full h-9 text-sm">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>{filters.method === 'all' ? "Método de Pago" : `Método: ${filters.method === 'cash' ? 'Efectivo' : filters.method === 'card' ? 'Tarjeta' : filters.method === 'credit' ? 'Crédito' : 'Transferencia'}`}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.type}
              onValueChange={(value) => setFilters({...filters, type: value as any})}
            >
              <SelectTrigger className="w-full h-9 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{filters.type === 'all' ? "Tipo de Pago" : filters.type === 'advance' ? 'Anticipos' : 'Pagos Regulares'}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="advance">Anticipos</SelectItem>
                <SelectItem value="regular">Pagos Regulares</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="grid grid-cols-2 gap-1">
              <DatePicker
                selected={dateRange.from}
                onSelect={(date) => 
                  setDateRange(prev => ({ ...prev, from: date }))
                }
                placeholderText="Fecha inicio"
              />
              <DatePicker
                selected={dateRange.to}
                onSelect={(date) => 
                  setDateRange(prev => ({ ...prev, to: date }))
                }
                placeholderText="Fecha fin"
              />
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setFilters({method: "all", customer: ""});
                setDateRange({});
                setActiveTab("all");
              }}
              className="h-9 text-sm"
            >
              Limpiar filtros
            </Button>
          </div>
        </div>

        {/* Vista de escritorio: Tabla de Pagos (ahora oculta) */}
        <div className="hidden">
          <Card>
            <ScrollArea className="h-[calc(100vh-360px)] min-h-[300px]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow className="text-xs">
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
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground">
                        Cargando pagos...
                      </TableCell>
                    </TableRow>
                  ) : filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground">
                        No hay pagos que coincidan con los filtros
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="py-1.5 font-medium">{payment.customerName || '-'}</TableCell>
                        <TableCell className="py-1.5">
                          {formatDateRD(payment.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex flex-col gap-1">
                            <span>
                              {payment.isAdvance 
                                ? payment.documentNumber || '-' 
                                : `#${payment.invoiceNumber}`}
                            </span>
                            {payment.isAdvance && (
                              <Badge variant="outline" className="w-fit text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-300">
                                ANTICIPO
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <PaymentMethodBadge method={payment.method} />
                        </TableCell>
                        <TableCell className="py-1.5 truncate max-w-[150px]">{payment.notes || "-"}</TableCell>
                        <TableCell className="py-1.5 text-right font-semibold">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setDetailsOpen(true);
                            }}
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </div>
        
        {/* Vista responsiva: Tarjetas de pagos */}
        <div className="block">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Cargando pagos...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No hay pagos que coincidan con los filtros
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredPayments.map((payment) => (
                <Card 
                  key={payment.id} 
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedPayment(payment);
                    setDetailsOpen(true);
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex flex-wrap justify-between items-center mb-2">
                      <div className="font-medium text-sm">{payment.customerName}</div>
                      <PaymentMethodBadge method={payment.method} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs mb-2">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDateRD(payment.date, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        {payment.isAdvance 
                          ? payment.documentNumber || '-'
                          : `Factura #${payment.invoiceNumber}`}
                      </div>
                    </div>
                    
                    {payment.isAdvance && (
                      <div className="mb-2">
                        <Badge variant="outline" className="w-fit text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 border-green-300">
                          ANTICIPO
                        </Badge>
                      </div>
                    )}
                    
                    {payment.notes && (
                      <div className="text-xs text-muted-foreground mb-2 truncate border-t pt-2 border-muted/10">
                        {payment.notes}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="text-base font-bold">{formatCurrency(payment.amount)}</div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            printPaymentReceipt(payment);
                          }}
                          data-testid={`button-print-${payment.id}`}
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayment(payment);
                            setDetailsOpen(true);
                          }}
                        >
                          Ver detalles
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de detalles del pago */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalles del Pago</DialogTitle>
            <DialogDescription>
              Información completa del pago seleccionado
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Cliente:</p>
                  <p className="font-medium">{selectedPayment.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {selectedPayment.isAdvance ? 'Documento:' : 'Factura:'}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {selectedPayment.isAdvance 
                        ? selectedPayment.documentNumber || '-'
                        : `#${selectedPayment.invoiceNumber}`}
                    </p>
                    {selectedPayment.isAdvance && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300">
                        ANTICIPO
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fecha:</p>
                  <p className="font-medium">
                    {formatDateRD(selectedPayment.date, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Método de Pago:</p>
                  <p className="font-medium">
                    <PaymentMethodBadge method={selectedPayment.method} />
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Monto:</p>
                  <p className="font-medium text-lg">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                {selectedPayment.reference && (
                  <div>
                    <p className="text-muted-foreground text-xs">Referencia:</p>
                    <p className="font-medium">{selectedPayment.reference}</p>
                  </div>
                )}
              </div>
              
              {selectedPayment.notes && (
                <div>
                  <p className="text-muted-foreground text-xs">Notas:</p>
                  <p className="text-sm mt-1 p-2 bg-muted/20 rounded-md">{selectedPayment.notes}</p>
                </div>
              )}
              
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (selectedPayment) {
                      printPaymentReceipt(selectedPayment);
                    }
                  }}
                  data-testid="button-print-receipt"
                >
                  <Printer className="h-3.5 w-3.5 mr-2" />
                  Imprimir Recibo
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Implementar descargar PDF
                    toast({
                      title: "Descargando recibo",
                      description: "El recibo se está preparando para descargar",
                    });
                  }}
                >
                  <DownloadCloud className="h-3.5 w-3.5 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setDetailsOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}