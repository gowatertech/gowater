import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
  AlertCircle
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
import { Card, CardContent } from "@/components/ui/card";
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

// Tipo para los pagos con detalles adicionales
interface PaymentWithDetails {
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  amount: string;
  paymentMethod: "cash" | "credit" | "card" | "transfer";
  date: string;
  reference?: string;
  notes?: string;
}

// Tipo para las estadísticas de pago
interface PaymentsStats {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  pendingAmount: number;
}

export default function PaymentsList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filters, setFilters] = useState({
    method: "" as "" | "cash" | "credit" | "card" | "transfer",
    dateRange: "" as "" | "today" | "week" | "month" | "custom",
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
    if (filters.method) {
      result = result.filter(payment => payment.paymentMethod === filters.method);
    }
    
    // Filtrar por rango de fecha
    if (filters.dateRange) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (filters.dateRange === "today") {
        result = result.filter(payment => {
          const paymentDate = new Date(payment.date);
          return paymentDate >= today;
        });
      } else if (filters.dateRange === "week") {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        result = result.filter(payment => {
          const paymentDate = new Date(payment.date);
          return paymentDate >= weekStart;
        });
      } else if (filters.dateRange === "month") {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        result = result.filter(payment => {
          const paymentDate = new Date(payment.date);
          return paymentDate >= monthStart;
        });
      }
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        payment =>
          payment.customerName.toLowerCase().includes(term) ||
          payment.invoiceNumber.includes(term) ||
          (payment.notes && payment.notes.toLowerCase().includes(term))
      );
    }
    
    // Organizar por fecha (más recientes primero)
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, searchTerm, filters]);

  // Calcular estadísticas de pagos basadas en los filtros aplicados
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
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Filtrar los pagos por método si hay un filtro aplicado
    let paymentsToAnalyze = payments;
    if (filters.method) {
      paymentsToAnalyze = payments.filter(payment => payment.paymentMethod === filters.method);
    }
    
    let totalToday = 0;
    let totalWeek = 0;
    let totalMonth = 0;
    
    paymentsToAnalyze.forEach(payment => {
      const paymentDate = new Date(payment.date);
      const amount = parseFloat(payment.amount);
      
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
    
    // Calcular monto pendiente (solo como ejemplo - esto debería venir de facturas pendientes)
    const pendingAmount = 0; // Esto debe ser reemplazado con datos reales
    
    return {
      totalToday,
      totalWeek,
      totalMonth,
      pendingAmount
    };
  }, [payments, filters.method]);

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

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-4">
        {/* Encabezado con título y estadísticas */}
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Lista de Pagos
          </h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </Button>
        </div>

        {/* Resumen de Pagos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
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

        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, factura o notas..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select
            value={filters.method}
            onValueChange={(value) => setFilters({...filters, method: value as any})}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>{filters.method ? `Método: ${filters.method}` : "Método de Pago"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="card">Tarjeta</SelectItem>
              <SelectItem value="credit">Crédito</SelectItem>
              <SelectItem value="transfer">Transferencia</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={filters.dateRange}
            onValueChange={(value) => setFilters({...filters, dateRange: value as any})}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{filters.dateRange ? `Periodo: ${filters.dateRange}` : "Periodo"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabla de Pagos */}
        <Card>
          <ScrollArea className="h-[calc(100vh-340px)] min-h-[300px]">
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
                        {format(new Date(payment.date), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell className="py-1.5">#{payment.invoiceNumber}</TableCell>
                      <TableCell className="py-1.5">
                        <PaymentMethodBadge method={payment.paymentMethod} />
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
                  <p className="text-muted-foreground text-xs">Factura:</p>
                  <p className="font-medium">#{selectedPayment.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fecha:</p>
                  <p className="font-medium">
                    {format(new Date(selectedPayment.date), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Método de Pago:</p>
                  <p className="font-medium">
                    <PaymentMethodBadge method={selectedPayment.paymentMethod} />
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