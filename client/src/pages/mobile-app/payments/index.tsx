import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  Wallet,
  Search, 
  Filter, 
  XCircle,
  CheckCircle, 
  AlertCircle,
  CreditCard,
  DollarSign,
  FileText,
  Calendar,
  ArrowLeft,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MobileHeader } from "../components/MobileHeader";
import { MobileFooter } from "../components/MobileFooter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Tipo para un pago
interface Payment {
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
interface PaymentStats {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  pendingAmount: number;
}

export default function MobilePayments() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const user = useCurrentUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("");

  // Cargar pagos
  const { data: payments, isLoading, refetch } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: true,
  });

  // Filtrar y ordenar pagos
  const filteredPayments = useMemo(() => {
    if (!payments) return [];

    // Aplicar filtros
    let filtered = [...payments];

    // Filtrar por método si está seleccionado
    if (filterMethod) {
      filtered = filtered.filter(payment => payment.paymentMethod === filterMethod);
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        payment =>
          payment.customerName.toLowerCase().includes(term) ||
          payment.invoiceNumber.includes(term) ||
          (payment.notes && payment.notes.toLowerCase().includes(term))
      );
    }

    // Filtrar por pestaña activa
    if (activeTab === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= today;
      });
    } else if (activeTab === "week") {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= weekStart;
      });
    } else if (activeTab === "month") {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= monthStart;
      });
    }

    // Ordenar por fecha (más reciente primero)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, searchTerm, activeTab, filterMethod]);

  // Calcular estadísticas de pagos
  const paymentStats: PaymentStats = useMemo(() => {
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
    
    let totalToday = 0;
    let totalWeek = 0;
    let totalMonth = 0;
    
    payments.forEach(payment => {
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
  }, [payments]);

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
    let icon;

    if (method === "cash") {
      variant = "default";
      label = "Efectivo";
      icon = <DollarSign className="h-3 w-3 mr-1" />;
    } else if (method === "card") {
      variant = "secondary";
      label = "Tarjeta";
      icon = <CreditCard className="h-3 w-3 mr-1" />;
    } else if (method === "credit") {
      variant = "outline";
      label = "Crédito";
      icon = <FileText className="h-3 w-3 mr-1" />;
    } else if (method === "transfer") {
      variant = "outline";
      label = "Transferencia";
      icon = <FileText className="h-3 w-3 mr-1" />;
    }

    return (
      <Badge variant={variant} className="flex items-center text-[10px] h-5">
        {icon}
        {label}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MobileHeader 
        title="Pagos" 
        darkMode={false} 
        onToggleDarkMode={() => {}}
        onSyncData={() => refetch()}
      />

      <main className="flex-1 p-3 pt-2 pb-16 overflow-auto">


        {/* Resumen de estadísticas */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center">
              <div className="w-full">
                <p className="text-[10px] text-muted-foreground">Pagos Hoy</p>
                <p className="text-sm font-bold">{formatCurrency(paymentStats.totalToday)}</p>
              </div>
              <Calendar className="h-6 w-6 text-blue-400" />
            </CardContent>
          </Card>
          
          <Card className="bg-muted/20">
            <CardContent className="p-2 flex items-center">
              <div className="w-full">
                <p className="text-[10px] text-muted-foreground">Esta Semana</p>
                <p className="text-sm font-bold">{formatCurrency(paymentStats.totalWeek)}</p>
              </div>
              <CreditCard className="h-6 w-6 text-green-400" />
            </CardContent>
          </Card>
        </div>

        {/* Pestañas y filtros */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="w-full h-8">
                <TabsTrigger value="all" className="text-[11px] flex-1">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="today" className="text-[11px] flex-1">
                  Hoy
                </TabsTrigger>
                <TabsTrigger value="week" className="text-[11px] flex-1">
                  Semana
                </TabsTrigger>
                <TabsTrigger value="month" className="text-[11px] flex-1">
                  Mes
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar pagos..."
                className="pl-7 h-8 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-8 w-8 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <Button 
              variant={filterMethod ? "default" : "outline"} 
              size="sm" 
              className="h-8 px-2 gap-1"
              onClick={() => setFilterOpen(true)}
            >
              <Filter className="h-3.5 w-3.5" />
              {filterMethod ? <span className="text-[10px]">{filterMethod}</span> : null}
            </Button>
          </div>
        </div>

        {/* Lista de pagos */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Cargando pagos...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay pagos que coincidan con los filtros
            </div>
          ) : (
            <>
              {filteredPayments.map((payment) => (
                <Card 
                  key={payment.id} 
                  className="overflow-hidden"
                  onClick={() => {
                    setSelectedPayment(payment);
                    setDetailsOpen(true);
                  }}
                >
                  <CardContent className="p-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-sm">{payment.customerName}</span>
                          <PaymentMethodBadge method={payment.paymentMethod} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Factura #{payment.invoiceNumber} &middot; {format(new Date(payment.date), 'dd/MM/yyyy', { locale: es })}
                        </div>
                      </div>
                      <div className="font-semibold text-sm">
                        {formatCurrency(payment.amount)}
                      </div>
                    </div>
                    
                    {payment.notes && (
                      <div className="mt-1 text-[10px] text-muted-foreground truncate">
                        {payment.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </main>

      <MobileFooter darkMode={false} />

      {/* Diálogo de filtros */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filtrar pagos</DialogTitle>
            <DialogDescription>
              Selecciona el método de pago a filtrar
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 py-4">
            <Button 
              variant={filterMethod === "cash" ? "default" : "outline"}
              className="flex flex-col items-center justify-center h-20 text-center"
              onClick={() => {
                setFilterMethod(filterMethod === "cash" ? "" : "cash");
                setFilterOpen(false);
              }}
            >
              <DollarSign className="h-8 w-8 mb-1" />
              <span className="text-xs">Efectivo</span>
            </Button>

            <Button 
              variant={filterMethod === "card" ? "default" : "outline"}
              className="flex flex-col items-center justify-center h-20 text-center"
              onClick={() => {
                setFilterMethod(filterMethod === "card" ? "" : "card");
                setFilterOpen(false);
              }}
            >
              <CreditCard className="h-8 w-8 mb-1" />
              <span className="text-xs">Tarjeta</span>
            </Button>

            <Button 
              variant={filterMethod === "credit" ? "default" : "outline"}
              className="flex flex-col items-center justify-center h-20 text-center"
              onClick={() => {
                setFilterMethod(filterMethod === "credit" ? "" : "credit");
                setFilterOpen(false);
              }}
            >
              <FileText className="h-8 w-8 mb-1" />
              <span className="text-xs">Crédito</span>
            </Button>

            <Button 
              variant={filterMethod === "transfer" ? "default" : "outline"}
              className="flex flex-col items-center justify-center h-20 text-center"
              onClick={() => {
                setFilterMethod(filterMethod === "transfer" ? "" : "transfer");
                setFilterOpen(false);
              }}
            >
              <ArrowLeft className="h-8 w-8 mb-1" />
              <span className="text-xs">Transferencia</span>
            </Button>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterMethod("");
                setFilterOpen(false);
              }}
            >
              Limpiar filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de detalles del pago */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Detalles del Pago</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-md">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold">Monto:</span>
                  <span className="text-xl font-bold">{formatCurrency(selectedPayment.amount)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
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
                    {format(new Date(selectedPayment.date), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Método de Pago:</p>
                  <p>
                    <PaymentMethodBadge method={selectedPayment.paymentMethod} />
                  </p>
                </div>
                
                {selectedPayment.reference && (
                  <div className="col-span-2">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}