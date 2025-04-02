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
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // Consulta para obtener pagos
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ["/api/payments"],
    queryFn: async () => {
      const response = await apiRequest("/api/payments");
      return response;
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
      (stats, payment) => {
        const paymentDate = new Date(payment.date).getTime();
        const amount = payment.amount || 0;

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

  // Filtrar pagos por término de búsqueda
  const filteredPayments = useMemo(() => {
    if (!searchTerm.trim()) return payments;

    const searchLower = searchTerm.toLowerCase().trim();
    return payments.filter(
      (payment) =>
        (payment.customerName && payment.customerName.toLowerCase().includes(searchLower)) ||
        (payment.invoiceNumber && payment.invoiceNumber.toString().includes(searchLower)) ||
        (payment.notes && payment.notes.toLowerCase().includes(searchLower))
    );
  }, [payments, searchTerm]);

  // Ordenar pagos por fecha (más recientes primero)
  const sortedPayments = useMemo(() => {
    return [...filteredPayments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredPayments]);

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
              <CalendarDays className="h-8 w-8 text-blue-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pagos Esta Semana</p>
                <p className="text-lg font-bold">{formatCurrency(paymentsStats.totalWeek)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pagos Este Mes</p>
                <p className="text-lg font-bold">{formatCurrency(paymentsStats.totalMonth)}</p>
              </div>
              <CircleDollarSign className="h-8 w-8 text-yellow-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pagos Pendientes</p>
                <p className="text-lg font-bold">{formatCurrency(paymentsStats.pendingAmount)}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-red-400" />
            </CardContent>
          </Card>
        </div>

        {/* Tarjetas para Navegación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Card className="hover:bg-muted/10 transition-colors cursor-pointer">
            <Link href="/payments/register">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Registrar Pago</h3>
                  <p className="text-sm text-muted-foreground">Añadir un nuevo pago al sistema</p>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:bg-muted/10 transition-colors cursor-pointer">
            <Link href="/payments/history">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center">
                  <HistoryIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Historial de Pagos</h3>
                  <p className="text-sm text-muted-foreground">Ver todos los pagos realizados</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Panel de historial de pagos recientes */}
        <Card className="mt-4">
          <CardHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-xl">Pagos Recientes</CardTitle>
              </div>
              <Link href="/payments/history">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 text-xs"
                >
                  Ver Historial Completo
                </Button>
              </Link>
            </div>
            <CardDescription className="text-sm">
              Últimos pagos registrados en el sistema
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
                    sortedPayments.slice(0, 5).map((payment) => (
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
      </div>
    </div>
  );
}