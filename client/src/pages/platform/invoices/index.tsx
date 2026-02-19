import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { PlatformLayout } from "../_components/PlatformLayout";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { 
  PlusIcon, PencilIcon, TrashIcon, RefreshCw, Search, FileText,
  CheckCircle, Clock, XCircle, DollarSign, TrendingUp, AlertTriangle,
  Zap, Download, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";

interface MembershipInvoice {
  id: number;
  companyId: number;
  companyName?: string;
  planId: number;
  planName?: string;
  amount: string;
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  invoiceDate: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
}

interface InvoiceStats {
  totalInvoiced: string;
  pendingAmount: string;
  paidAmount: string;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
  totalCount: number;
}

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function InvoicesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [invoiceToDelete, setInvoiceToDelete] = useState<MembershipInvoice | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [generatingPdf, setGeneratingPdf] = useState<number | null>(null);

  const { data: invoicesRes, isLoading, refetch } = useQuery({
    queryKey: ["/api/platform/membership-invoices"],
    queryFn: () => apiRequest({ url: "/api/platform/membership-invoices", method: "GET" }),
  });

  const { data: statsRes } = useQuery({
    queryKey: ["/api/platform/membership-invoices/stats"],
    queryFn: () => apiRequest({ url: "/api/platform/membership-invoices/stats", method: "GET" }),
  });

  const stats: InvoiceStats | null = statsRes as InvoiceStats | null;

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: number) => apiRequest({ url: `/api/platform/membership-invoices/${id}`, method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Factura eliminada", description: "La factura ha sido eliminada correctamente" });
      setInvoiceToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/platform/membership-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/membership-invoices/stats"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "No se pudo eliminar la factura", variant: "destructive" });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest({
        url: `/api/platform/membership-invoices/${id}`,
        method: "PUT",
        data: { status: "paid", paidDate: new Date().toISOString().split('T')[0] },
      }),
    onSuccess: () => {
      toast({ title: "Factura actualizada", description: "La factura ha sido marcada como pagada" });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/membership-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/membership-invoices/stats"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "No se pudo actualizar la factura", variant: "destructive" });
    },
  });

  const generateCycleMutation = useMutation({
    mutationFn: (data: { year: number; month: number }) =>
      apiRequest({ url: "/api/platform/membership-invoices/generate-cycle", method: "POST", data }),
    onSuccess: (data: any) => {
      toast({
        title: "Ciclo generado",
        description: data.message || `Se generaron ${data.generated} facturas`,
      });
      setShowGenerateDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/platform/membership-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/membership-invoices/stats"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "No se pudo generar el ciclo", variant: "destructive" });
    },
  });

  const invoices = invoicesRes?.data || [];

  const filteredInvoices = invoices.filter((invoice: MembershipInvoice) => {
    const matchesSearch =
      (invoice.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.notes || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.id.toString().includes(searchTerm);

    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter ||
      (statusFilter === "overdue" && invoice.status === "pending" && new Date(invoice.dueDate) < new Date());

    return matchesSearch && matchesStatus;
  });

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(parseFloat(price || "0"));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd/MM/yyyy");
  };

  const getStatusBadge = (status: string, dueDate?: string) => {
    const isOverdue = status === "pending" && dueDate && new Date(dueDate) < new Date();
    if (isOverdue) {
      return { className: "bg-red-100 text-red-700 border-red-200", icon: <AlertTriangle className="w-3 h-3 mr-1" />, text: "Vencida" };
    }
    switch (status) {
      case 'paid':
        return { className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle className="w-3 h-3 mr-1" />, text: "Pagada" };
      case 'pending':
        return { className: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3 mr-1" />, text: "Pendiente" };
      case 'cancelled':
        return { className: "bg-gray-100 text-gray-600 border-gray-200", icon: <XCircle className="w-3 h-3 mr-1" />, text: "Cancelada" };
      default:
        return { className: "bg-gray-100 text-gray-600", icon: null, text: status };
    }
  };

  const generatePdf = async (invoiceId: number) => {
    setGeneratingPdf(invoiceId);
    try {
      const res = await apiRequest({
        url: `/api/platform/membership-invoices/${invoiceId}/pdf-data`,
        method: "GET",
      }) as any;

      const { invoice, company, plan, platform } = res;
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      const invoiceNum = String(invoice.id).padStart(6, '0');
      const billingName = platform.billingCompanyName || platform.name || "GoWater";

      let logoLoaded = false;
      if (platform.logo) {
        try {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject();
            img.src = platform.logo;
          });
          doc.addImage(img, "PNG", 15, 12, 30, 30);
          logoLoaded = true;
        } catch { /* skip logo if can't load */ }
      }

      const headerTextX = logoLoaded ? 50 : 15;

      doc.setFontSize(16);
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.text(billingName, headerTextX, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      let headerY = 27;
      if (platform.address) { doc.text(platform.address, headerTextX, headerY); headerY += 5; }
      if (platform.phone) { doc.text(`Tel: ${platform.phone}`, headerTextX, headerY); headerY += 5; }
      if (platform.email) { doc.text(platform.email, headerTextX, headerY); headerY += 5; }
      if (platform.rnc) { doc.text(`RNC: ${platform.rnc}`, headerTextX, headerY); }

      doc.setFontSize(20);
      doc.setTextColor(55, 65, 81);
      doc.setFont("helvetica", "bold");
      doc.text("FACTURA", pw - 15, 20, { align: "right" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(`No. ${invoiceNum}`, pw - 15, 28, { align: "right" });

      const statusText = invoice.status === "paid" ? "PAGADA" : invoice.status === "pending" ? "PENDIENTE" : invoice.status === "cancelled" ? "CANCELADA" : "VENCIDA";
      const isPaid = invoice.status === "paid";
      if (isPaid) {
        doc.setFillColor(220, 252, 231);
        doc.setTextColor(22, 101, 52);
      } else {
        doc.setFillColor(254, 243, 199);
        doc.setTextColor(146, 64, 14);
      }
      const badgeW = doc.getTextWidth(statusText) + 12;
      doc.roundedRect(pw - 15 - badgeW, 32, badgeW, 8, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(statusText, pw - 15 - badgeW / 2, 37.5, { align: "center" });

      doc.setDrawColor(229, 231, 235);
      doc.line(15, 48, pw - 15, 48);

      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("FACTURAR A", 15, 57);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text(company.name || "---", 15, 64);

      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("DETALLES", pw - 80, 57);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text("Fecha emisión:", pw - 80, 64);
      doc.text(formatDate(invoice.invoiceDate), pw - 15, 64, { align: "right" });
      doc.text("Vencimiento:", pw - 80, 71);
      doc.text(formatDate(invoice.dueDate), pw - 15, 71, { align: "right" });
      if (invoice.paidDate) {
        doc.text("Fecha de pago:", pw - 80, 78);
        doc.text(formatDate(invoice.paidDate), pw - 15, 78, { align: "right" });
      }

      const tableTop = 90;
      doc.setFillColor(249, 250, 251);
      doc.rect(15, tableTop, pw - 30, 10, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.line(15, tableTop, pw - 15, tableTop);
      doc.line(15, tableTop + 10, pw - 15, tableTop + 10);

      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.setFont("helvetica", "bold");
      doc.text("DESCRIPCIÓN", 20, tableTop + 7);
      doc.text("CANT.", pw - 85, tableTop + 7, { align: "center" });
      doc.text("PRECIO", pw - 55, tableTop + 7, { align: "right" });
      doc.text("TOTAL", pw - 20, tableTop + 7, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      const rowY = tableTop + 20;
      doc.setFontSize(10);
      doc.text(`Membresía ${plan.name || "---"}`, 20, rowY);
      if (invoice.notes) {
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(invoice.notes, 20, rowY + 5);
      }
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      doc.text("1", pw - 85, rowY, { align: "center" });
      doc.text(formatPrice(invoice.amount), pw - 55, rowY, { align: "right" });
      doc.text(formatPrice(invoice.amount), pw - 20, rowY, { align: "right" });

      doc.setDrawColor(229, 231, 235);
      doc.line(15, rowY + 10, pw - 15, rowY + 10);

      const totY = rowY + 22;
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("Subtotal", pw - 65, totY);
      doc.setTextColor(55, 65, 81);
      doc.text(formatPrice(invoice.amount), pw - 20, totY, { align: "right" });

      doc.setTextColor(107, 114, 128);
      doc.text("Impuestos (0%)", pw - 65, totY + 8);
      doc.setTextColor(55, 65, 81);
      doc.text("$0.00", pw - 20, totY + 8, { align: "right" });

      doc.setDrawColor(229, 231, 235);
      doc.line(pw - 80, totY + 13, pw - 15, totY + 13);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      doc.text("Total", pw - 65, totY + 22);
      doc.text(formatPrice(invoice.amount), pw - 20, totY + 22, { align: "right" });

      doc.setDrawColor(229, 231, 235);
      doc.line(15, 260, pw - 15, 260);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Factura generada por ${platform.name || "GoWater"}`, pw / 2, 268, { align: "center" });
      if (platform.email) {
        doc.text(platform.email, pw / 2, 274, { align: "center" });
      }

      doc.save(`Factura-${invoiceNum}.pdf`);
      toast({ title: "PDF generado", description: "La factura se ha descargado correctamente" });
    } catch (error: any) {
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" });
    } finally {
      setGeneratingPdf(null);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <FileText className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                Facturación
              </h1>
              <p className="text-blue-100 mt-1 text-sm">Gestión de facturas de membresía</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setShowGenerateDialog(true)}
                className="bg-white/15 hover:bg-white/25 text-white border-0"
              >
                <Zap className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Generar </span>Ciclo
              </Button>
              <Button
                size="sm"
                onClick={() => setLocation("/platform/invoices/new")}
                className="bg-white text-blue-700 hover:bg-blue-50 border-0"
              >
                <PlusIcon className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Nueva </span>Factura
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Facturado</p>
                  <p className="text-sm md:text-lg font-bold text-blue-700 truncate">{stats ? formatPrice(stats.totalInvoiced) : "$0.00"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cobrado</p>
                  <p className="text-sm md:text-lg font-bold text-emerald-700 truncate">{stats ? formatPrice(stats.paidAmount) : "$0.00"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendiente</p>
                  <p className="text-sm md:text-lg font-bold text-amber-700 truncate">{stats ? formatPrice(stats.pendingAmount) : "$0.00"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vencidas</p>
                  <p className="text-sm md:text-lg font-bold text-red-700">{stats?.overdueCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por empresa o número..."
                  className="pl-9 w-full rounded-xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="paid">Pagadas</SelectItem>
                    <SelectItem value="overdue">Vencidas</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => refetch()} className="rounded-xl">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium">No hay facturas</h3>
                <p className="mt-1 text-sm">
                  {searchTerm || statusFilter !== "all"
                    ? "No se encontraron facturas con los filtros aplicados"
                    : "Genera un ciclo de facturación o crea una factura manual"}
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button variant="outline" onClick={() => setShowGenerateDialog(true)} className="rounded-xl">
                    <Zap className="mr-2 h-4 w-4" /> Generar Ciclo
                  </Button>
                  <Button onClick={() => setLocation("/platform/invoices/new")} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600">
                    <PlusIcon className="mr-2 h-4 w-4" /> Nueva Factura
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="font-semibold">#</TableHead>
                        <TableHead className="font-semibold">Empresa</TableHead>
                        <TableHead className="font-semibold">Plan</TableHead>
                        <TableHead className="font-semibold">Monto</TableHead>
                        <TableHead className="font-semibold">Estado</TableHead>
                        <TableHead className="font-semibold">Emisión</TableHead>
                        <TableHead className="font-semibold">Vencimiento</TableHead>
                        <TableHead className="text-right font-semibold">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice: MembershipInvoice) => {
                        const statusBadge = getStatusBadge(invoice.status, invoice.dueDate);
                        return (
                          <TableRow key={invoice.id} className="hover:bg-gray-50/50">
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {String(invoice.id).padStart(4, '0')}
                            </TableCell>
                            <TableCell className="font-medium">
                              {invoice.companyName || `Empresa #${invoice.companyId}`}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {invoice.planName || `Plan #${invoice.planId}`}
                            </TableCell>
                            <TableCell className="font-semibold">{formatPrice(invoice.amount)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-xs font-medium", statusBadge.className)}>
                                {statusBadge.icon} {statusBadge.text}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(invoice.invoiceDate)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDate(invoice.dueDate)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {invoice.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => markAsPaidMutation.mutate(invoice.id)}
                                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    title="Marcar como pagada"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => generatePdf(invoice.id)}
                                  disabled={generatingPdf === invoice.id}
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Descargar PDF"
                                >
                                  {generatingPdf === invoice.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setLocation(`/platform/invoices/${invoice.id}`)}
                                  className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                  title="Editar"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setInvoiceToDelete(invoice)}
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  title="Eliminar"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="md:hidden space-y-3">
                  {filteredInvoices.map((invoice: MembershipInvoice) => {
                    const statusBadge = getStatusBadge(invoice.status, invoice.dueDate);
                    return (
                      <Card key={invoice.id} className="p-3 border">
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{invoice.companyName || `Empresa #${invoice.companyId}`}</p>
                            <p className="text-xs text-muted-foreground">#{String(invoice.id).padStart(4, '0')} · {invoice.planName || `Plan #${invoice.planId}`}</p>
                          </div>
                          <Badge variant="outline" className={cn("text-xs font-medium flex-shrink-0 ml-2", statusBadge.className)}>
                            {statusBadge.icon} {statusBadge.text}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-xs mb-3">
                          <div>
                            <span className="text-muted-foreground block">Monto</span>
                            <span className="font-semibold">{formatPrice(invoice.amount)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Emisión</span>
                            <span>{formatDate(invoice.invoiceDate)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Vence</span>
                            <span>{formatDate(invoice.dueDate)}</span>
                          </div>
                        </div>
                        <div className="flex justify-end gap-1">
                          {invoice.status === "pending" && (
                            <Button variant="ghost" size="sm" onClick={() => markAsPaidMutation.mutate(invoice.id)} className="text-emerald-600 h-7 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" /> Pagada
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => generatePdf(invoice.id)} disabled={generatingPdf === invoice.id} className="text-blue-600 h-7 text-xs">
                            {generatingPdf === invoice.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3 mr-1" />} PDF
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setLocation(`/platform/invoices/${invoice.id}`)} className="text-gray-600 h-7 text-xs">
                            <PencilIcon className="h-3 w-3 mr-1" /> Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setInvoiceToDelete(invoice)} className="text-red-500 h-7 text-xs">
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}

            {filteredInvoices.length > 0 && (
              <div className="flex justify-between items-center mt-4 pt-3 border-t">
                <div className="text-sm text-muted-foreground">
                  {filteredInvoices.length} factura{filteredInvoices.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              Generar Ciclo de Facturación
            </DialogTitle>
            <DialogDescription>
              Se generarán facturas automáticamente para todas las empresas activas y suspendidas que no tengan factura en el período seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Mes</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, i) => (
                    <SelectItem key={i} value={(i + 1).toString()}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Año</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
            Se facturará el período de <strong>{monthNames[parseInt(selectedMonth) - 1]} {selectedYear}</strong> con vencimiento al final del mes.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={() => generateCycleMutation.mutate({ year: parseInt(selectedYear), month: parseInt(selectedMonth) })}
              disabled={generateCycleMutation.isPending}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              {generateCycleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generar Facturas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la factura #{invoiceToDelete?.id} de{" "}
              <span className="font-bold">{invoiceToDelete?.companyName || `Empresa #${invoiceToDelete?.companyId}`}</span>?
              <p className="mt-2 text-destructive">Esta acción no se puede deshacer.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceToDelete(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => invoiceToDelete && deleteInvoiceMutation.mutate(invoiceToDelete.id)}
              disabled={deleteInvoiceMutation.isPending}
            >
              {deleteInvoiceMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformLayout>
  );
}
