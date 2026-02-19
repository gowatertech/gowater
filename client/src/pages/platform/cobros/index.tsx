import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PlatformLayout } from "../_components/PlatformLayout";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { 
  Banknote, Search, DollarSign, TrendingUp, Clock, CheckCircle,
  XCircle, Plus, Loader2, Trash2, CreditCard, Building2, FileText,
  CalendarDays, MoreVertical, PencilIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface Payment {
  id: number;
  companyId: number;
  companyName?: string;
  invoiceId?: number | null;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  concept: string;
  reference?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
}

interface PaymentStats {
  totalCollected: string;
  totalPending: string;
  monthlyCollected: string;
  completedCount: number;
  pendingCount: number;
  cancelledCount: number;
  totalCount: number;
}

interface PendingInvoice {
  id: number;
  amount: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
  notes?: string;
  planName?: string;
}

const paymentMethodLabels: Record<string, string> = {
  transfer: "Transferencia",
  cash: "Efectivo",
  card: "Tarjeta",
  check: "Cheque",
  other: "Otro",
};

const statusLabels: Record<string, string> = {
  completed: "Completado",
  pending: "Pendiente",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function CobrosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { data: paymentsData, isLoading } = useQuery<{ data: Payment[] }>({
    queryKey: ["/api/platform/platform-payments"],
    queryFn: () => apiRequest({ url: "/api/platform/platform-payments", method: "GET" }),
  });

  const { data: statsData } = useQuery<PaymentStats>({
    queryKey: ["/api/platform/platform-payments/stats"],
    queryFn: () => apiRequest({ url: "/api/platform/platform-payments/stats", method: "GET" }),
  });

  const { data: companiesData } = useQuery<{ data: any[] }>({
    queryKey: ["/api/platform/companies"],
    queryFn: () => apiRequest({ url: "/api/platform/companies", method: "GET" }),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest({ url: `/api/platform/platform-payments/${id}`, method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Cobro eliminado", description: "El cobro ha sido eliminado correctamente" });
      setPaymentToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/platform/platform-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/platform-payments/stats"] });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el cobro", variant: "destructive" });
    },
  });

  const payments = paymentsData?.data || [];
  const stats = statsData;

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSearch =
        (p.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.reference || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesMethod = methodFilter === "all" || p.paymentMethod === methodFilter;
      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [payments, searchTerm, statusFilter, methodFilter]);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return "-";
    }
  };

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Banknote className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                Sistema de Cobros
              </h1>
              <p className="text-blue-100 mt-1 text-sm">Gestiona los cobros de facturas y otros conceptos</p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowNewPayment(true)}
              className="bg-white text-blue-700 hover:bg-blue-50 border-0"
            >
              <Plus className="mr-2 h-4 w-4" /> Nuevo Cobro
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="Total Cobrado"
            value={stats ? formatCurrency(stats.totalCollected) : "$0.00"}
            icon={<DollarSign className="w-4 h-4" />}
            color="emerald"
            subtitle={`${stats?.completedCount || 0} cobros`}
          />
          <StatCard
            title="Pendiente"
            value={stats ? formatCurrency(stats.totalPending) : "$0.00"}
            icon={<Clock className="w-4 h-4" />}
            color="amber"
            subtitle={`${stats?.pendingCount || 0} pendientes`}
          />
          <StatCard
            title="Cobrado este Mes"
            value={stats ? formatCurrency(stats.monthlyCollected) : "$0.00"}
            icon={<TrendingUp className="w-4 h-4" />}
            color="blue"
            subtitle="Mes actual"
          />
          <StatCard
            title="Total Registros"
            value={String(stats?.totalCount || 0)}
            icon={<FileText className="w-4 h-4" />}
            color="purple"
            subtitle={`${stats?.cancelledCount || 0} cancelados`}
          />
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base md:text-lg">Registro de Cobros</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Historial de pagos recibidos y cobros registrados
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por empresa, concepto, referencia..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Completados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Banknote className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No se encontraron cobros</p>
                <Button size="sm" className="mt-3" onClick={() => setShowNewPayment(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Registrar primer cobro
                </Button>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="text-sm">
                            {formatDate(payment.paymentDate)}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {payment.companyName || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1.5">
                              {payment.invoiceId && (
                                <FileText className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                              )}
                              <span className="truncate max-w-[200px]">{payment.concept}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {payment.reference || "-"}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${statusColors[payment.status] || ""}`} variant="secondary">
                              {statusLabels[payment.status] || payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setPaymentToDelete(payment)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden space-y-3">
                  {filteredPayments.map((payment) => (
                    <Card key={payment.id} className="rounded-xl">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                              <span className="font-medium text-sm truncate">{payment.companyName || "-"}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{payment.concept}</p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="font-bold text-sm">{formatCurrency(payment.amount)}</p>
                            <Badge className={`text-[10px] mt-1 ${statusColors[payment.status] || ""}`} variant="secondary">
                              {statusLabels[payment.status]}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(payment.paymentDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {paymentMethodLabels[payment.paymentMethod]}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setPaymentToDelete(payment)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <NewPaymentDialog
          open={showNewPayment}
          onOpenChange={setShowNewPayment}
          companies={companiesData?.data || []}
        />

        <Dialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de eliminar este cobro de {paymentToDelete && formatCurrency(paymentToDelete.amount)} 
                para {paymentToDelete?.companyName}? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentToDelete(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => paymentToDelete && deletePaymentMutation.mutate(paymentToDelete.id)}
                disabled={deletePaymentMutation.isPending}
              >
                {deletePaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlatformLayout>
  );
}

function StatCard({ title, value, icon, color, subtitle }: {
  title: string; value: string; icon: React.ReactNode; color: string; subtitle: string;
}) {
  const colorMap: Record<string, { bg: string; icon: string }> = {
    emerald: { bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-600" },
    amber: { bg: "bg-amber-50", icon: "bg-amber-100 text-amber-600" },
    blue: { bg: "bg-blue-50", icon: "bg-blue-100 text-blue-600" },
    purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600" },
  };
  const colors = colorMap[color] || colorMap.blue;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${colors.icon}`}>
            {icon}
          </div>
          <span className="text-xs text-muted-foreground font-medium">{title}</span>
        </div>
        <p className="text-lg sm:text-xl font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function NewPaymentDialog({ open, onOpenChange, companies }: {
  open: boolean; onOpenChange: (open: boolean) => void; companies: any[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [concept, setConcept] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentType, setPaymentType] = useState<"invoice" | "other">("invoice");

  const { data: pendingInvoicesData } = useQuery<{ data: PendingInvoice[] }>({
    queryKey: ["/api/platform/platform-payments/pending-invoices", companyId],
    queryFn: () => apiRequest({ url: `/api/platform/platform-payments/pending-invoices/${companyId}`, method: "GET" }),
    enabled: !!companyId && paymentType === "invoice",
  });

  const pendingInvoices = pendingInvoicesData?.data || [];

  useEffect(() => {
    if (!open) {
      setCompanyId("");
      setInvoiceId("");
      setAmount("");
      setPaymentMethod("transfer");
      setConcept("");
      setReference("");
      setNotes("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setPaymentType("invoice");
    }
  }, [open]);

  useEffect(() => {
    if (invoiceId && paymentType === "invoice") {
      const invoice = pendingInvoices.find(inv => inv.id === parseInt(invoiceId));
      if (invoice) {
        setAmount(invoice.amount);
        setConcept(`Pago Factura #${invoice.id} - ${invoice.planName || "Membresía"}`);
      }
    }
  }, [invoiceId, pendingInvoices, paymentType]);

  useEffect(() => {
    setInvoiceId("");
    setAmount("");
    setConcept("");
  }, [companyId]);

  const createPaymentMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest({ url: "/api/platform/platform-payments", method: "POST", data }),
    onSuccess: () => {
      toast({ title: "Cobro registrado", description: "El cobro se ha registrado correctamente" });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["/api/platform/platform-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/platform-payments/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/membership-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/membership-invoices/stats"] });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo registrar el cobro", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!companyId || !amount || !concept) {
      toast({ title: "Error", description: "Completa los campos requeridos", variant: "destructive" });
      return;
    }

    const data: any = {
      companyId: parseInt(companyId),
      amount: parseFloat(amount),
      paymentMethod,
      concept,
      reference: reference || null,
      notes: notes || null,
      status: "completed",
      paymentDate,
    };

    if (paymentType === "invoice" && invoiceId) {
      data.invoiceId = parseInt(invoiceId);
    }

    createPaymentMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-blue-600" />
            </div>
            Registrar Nuevo Cobro
          </DialogTitle>
          <DialogDescription>Registra un pago de factura o un cobro por otro concepto</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={paymentType === "invoice" ? "default" : "outline"}
              className={paymentType === "invoice" ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setPaymentType("invoice")}
            >
              <FileText className="mr-2 h-4 w-4" /> Pago Factura
            </Button>
            <Button
              type="button"
              variant={paymentType === "other" ? "default" : "outline"}
              className={paymentType === "other" ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setPaymentType("other")}
            >
              <DollarSign className="mr-2 h-4 w-4" /> Otro Concepto
            </Button>
          </div>

          <div>
            <Label>Empresa *</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentType === "invoice" && companyId && (
            <div>
              <Label>Factura Pendiente</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId}>
                <SelectTrigger>
                  <SelectValue placeholder={pendingInvoices.length === 0 ? "Sin facturas pendientes" : "Seleccionar factura"} />
                </SelectTrigger>
                <SelectContent>
                  {pendingInvoices.map((inv) => (
                    <SelectItem key={inv.id} value={String(inv.id)}>
                      #{inv.id} - ${inv.amount} ({inv.planName || "Membresía"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Concepto *</Label>
            <Input
              placeholder={paymentType === "invoice" ? "Se autocompleta al seleccionar factura" : "Ej: Configuración adicional, Soporte técnico..."}
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referencia</Label>
              <Input
                placeholder="Nro. transferencia, recibo..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <Textarea
              placeholder="Notas adicionales sobre el cobro..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={createPaymentMutation.isPending || !companyId || !amount || !concept}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {createPaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
