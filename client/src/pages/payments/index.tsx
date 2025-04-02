import { Link, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle,
  CircleDollarSign,
  ClipboardList,
  FileText,
  HistoryIcon,
  Plus,
  Search,
  Wallet,
  X,
  RefreshCw,
  Calendar,
  FileStack,
  ArrowUpDown,
  Filter
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Invoice {
  id: number;
  businessName?: string;
  customerId: number;
  date: string;
  total: number;
  status: string;
  pendingAmount?: string;
}

type Payment = {
  id: number;
  invoiceId: number;
  amount: number;
  date: string;
  paymentMethod: string;
  notes?: string;
  customerName?: string;
  invoiceNumber?: string;
  method?: string;
};

interface PaymentsStats {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  pendingAmount: number;
}

export default function PaymentDashboard() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({
    method: "" as "" | "cash" | "card" | "transfer"
  });

  console.log("Fetching data from /api/payments");
  // Consulta para obtener pagos
  const { data: payments = [], isLoading: isLoadingPayments, refetch } = useQuery<any[]>({
    queryKey: ["/api/payments"],
    queryFn: async ({ queryKey }) => {
      const response = await apiRequest("GET", queryKey[0] as string);
      const data = await response.json();
      console.log("Data received from /api/payments:", data);
      return Array.isArray(data) ? data : [];
    },
  });

  // Estadísticas de pagos
  const paymentsStats: PaymentsStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay()
    ).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return payments.reduce(
      (stats: PaymentsStats, payment: any) => {
        const paymentDate = new Date(payment.date).getTime();
        const amount = parseFloat(payment.amount) || 0;

        if (paymentDate >= today) {
          stats.totalToday += amount;
        }
        if (paymentDate >= weekStart) {
          stats.totalWeek += amount;
        }
        if (paymentDate >= monthStart) {
          stats.totalMonth += amount;
        }

        return stats;
      },
      { totalToday: 0, totalWeek: 0, totalMonth: 0, pendingAmount: 10000 }
    );
  }, [payments]);

  // Filtrar pagos por término de búsqueda y otros filtros
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    
    let result = [...payments];
    
    // Filtrar por método de pago
    if (filters.method) {
      result = result.filter(payment => 
        (payment.method || payment.paymentMethod) === filters.method
      );
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      result = result.filter(
        (payment) =>
          (payment.customerName && payment.customerName.toLowerCase().includes(searchLower)) ||
          (payment.invoiceNumber && payment.invoiceNumber.toString().includes(searchLower)) ||
          (payment.notes && payment.notes.toLowerCase().includes(searchLower))
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
    
    // Ordenar por fecha (más recientes primero)
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, searchTerm, filters, activeTab]);

  // Función para formatear montos en formato RD$
  const formatCurrency = (amount: number | string): string => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Componente para mostrar el método de pago con un badge
  const PaymentMethodBadge = ({ method }: { method?: string }) => {
    let variant: "default" | "outline" | "secondary" | "destructive" = "default";
    let label = method || "Desconocido";

    if (method === "cash" || method === "efectivo") {
      variant = "default";
      label = "Efectivo";
    } else if (method === "card" || method === "tarjeta") {
      variant = "secondary";
      label = "Tarjeta";
    } else if (method === "transfer" || method === "transferencia") {
      variant = "outline";
      label = "Transferencia";
    }

    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="container mx-auto p-2 md:p-4">
      <div className="flex flex-col space-y-4">
        {/* Encabezado */}
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Gestión de Pagos
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 text-xs flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>

        {/* Resumen de estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
          <Card className="bg-muted/20">
            <CardContent className="p-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Pagos Hoy</p>
                  <p className="text-sm sm:text-lg font-bold">{formatCurrency(paymentsStats.totalToday)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <CalendarDays className="h-6 w-6 sm:h-7 sm:w-7 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Pagos Esta Semana</p>
                  <p className="text-sm sm:text-lg font-bold">{formatCurrency(paymentsStats.totalWeek)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Pagos Este Mes</p>
                  <p className="text-sm sm:text-lg font-bold">{formatCurrency(paymentsStats.totalMonth)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <CircleDollarSign className="h-6 w-6 sm:h-7 sm:w-7 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Pagos Pendientes</p>
                  <p className="text-sm sm:text-lg font-bold">{formatCurrency(paymentsStats.pendingAmount)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <ClipboardList className="h-6 w-6 sm:h-7 sm:w-7 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tarjetas para Navegación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card 
            className="hover:bg-muted/10 transition-colors cursor-pointer" 
            onClick={() => setLocation("/payments/register")}
          >
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className="bg-primary/10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center">
                <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg">Registrar Pago</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Añadir un nuevo pago al sistema</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="hover:bg-muted/10 transition-colors cursor-pointer" 
            onClick={() => setLocation("/payments/history")}
          >
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className="bg-primary/10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center">
                <HistoryIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg">Historial de Pagos</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Ver todos los pagos realizados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel de historial de pagos recientes */}
        <Card>
          <CardHeader className="p-3 sm:p-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileStack className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Pagos Recientes</CardTitle>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                className="h-8 text-xs w-full sm:w-auto"
                onClick={() => setLocation("/payments/history")}
              >
                Ver Historial Completo
              </Button>
            </div>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Últimos pagos registrados en el sistema
            </CardDescription>
          </CardHeader>

          <CardContent className="p-3">
            {/* Filtros y opciones */}
            <div className="flex flex-col gap-2 mb-3">
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar pagos..."
                    className="pl-8 h-9 text-sm"
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
                
                <Select
                  value={filters.method}
                  onValueChange={(value) => setFilters({...filters, method: value as any})}
                >
                  <SelectTrigger className="w-full h-9 text-sm">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>{filters.method ? `Método: ${filters.method}` : "Método de Pago"}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vista de escritorio: Tabla de Pagos (solo visible en MD y superior) */}
            <div className="hidden md:block border rounded-lg overflow-hidden">
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
                  ) : filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-xs text-muted-foreground">
                        No hay pagos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.slice(0, 5).map((payment) => (
                      <TableRow key={payment.id} className="text-xs">
                        <TableCell className="py-1.5 font-medium">{payment.customerName || '-'}</TableCell>
                        <TableCell className="py-1.5">
                          {format(new Date(payment.date), 'dd/MM/yyyy', { locale: es })}
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
                                  <p className="font-medium">{format(new Date(payment.date), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
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
            
            {/* Vista móvil: Tarjetas de pagos (solo visible en tamaños small y medium) */}
            <div className="md:hidden">
              {isLoadingPayments ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Cargando pagos...
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {searchTerm 
                    ? "No se encontraron resultados para la búsqueda" 
                    : "No hay pagos que coincidan con los filtros"}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredPayments.slice(0, 6).map((payment) => (
                    <Card 
                      key={payment.id} 
                      className="overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-3">
                        <div className="flex flex-wrap justify-between items-center mb-2">
                          <div className="font-medium text-sm">{payment.customerName}</div>
                          <PaymentMethodBadge method={payment.method || payment.paymentMethod} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs mb-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(payment.date), 'dd/MM/yyyy', { locale: es })}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            Factura #{payment.invoiceNumber}
                          </div>
                        </div>
                        
                        {payment.notes && (
                          <div className="text-xs text-muted-foreground mb-2 truncate border-t pt-2 border-muted/10">
                            {payment.notes}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center">
                          <div className="text-base font-bold">{formatCurrency(payment.amount)}</div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs px-2"
                              >
                                Ver detalles
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
                                  <p className="font-medium">{format(new Date(payment.date), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
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
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}