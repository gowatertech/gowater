import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { PlatformLayout } from "../_components/PlatformLayout";
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
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  RefreshCw, 
  Search,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  FileSpreadsheet,
  Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Interfaz para representar una factura de membresía
interface MembershipInvoice {
  id: number;
  companyId: number;
  companyName?: string;
  planId: number;
  planName?: string;
  amount: string;
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  dueDate: string;
  paidDate?: string;
  notes?: string;
  createdAt?: string;
}

export default function InvoicesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [invoiceToDelete, setInvoiceToDelete] = useState<MembershipInvoice | null>(null);

  // Consulta para obtener todas las facturas de membresía
  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ["/api/platform/membership-invoices", { status: statusFilter !== "all" ? statusFilter : undefined }],
    queryFn: () => 
      apiRequest({
        url: "/api/platform/membership-invoices",
        method: "GET",
        params: statusFilter !== "all" ? { status: statusFilter } : undefined
      }),
  });

  // Mutación para eliminar una factura
  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest({
        url: `/api/platform/membership-invoices/${id}`,
        method: "DELETE"
      }),
    onSuccess: () => {
      toast({
        title: "Factura eliminada",
        description: "La factura ha sido eliminada correctamente",
      });
      setInvoiceToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/platform/membership-invoices"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la factura",
        variant: "destructive",
      });
    },
  });

  // Mutación para marcar una factura como pagada
  const markAsPaidMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest({
        url: `/api/platform/membership-invoices/${id}`,
        method: "PUT",
        data: {
          status: "paid",
          paidDate: new Date().toISOString().split('T')[0]
        }
      }),
    onSuccess: () => {
      toast({
        title: "Factura actualizada",
        description: "La factura ha sido marcada como pagada",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/membership-invoices"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la factura",
        variant: "destructive",
      });
    },
  });

  // Filtrar facturas por término de búsqueda, estado y fecha
  const filteredInvoices = React.useMemo(() => {
    if (!invoices?.data) return [];
    
    return invoices.data.filter((invoice: MembershipInvoice) => {
      // Filtrar por término de búsqueda (nombre de empresa o notas)
      const matchesSearch = 
        (invoice.companyName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.notes || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.id.toString()).includes(searchTerm);
      
      // Filtrar por fecha de vencimiento
      let matchesDate = true;
      if (dateFilter) {
        const invoiceDate = new Date(invoice.dueDate);
        matchesDate = (
          invoiceDate.getDate() === dateFilter.getDate() &&
          invoiceDate.getMonth() === dateFilter.getMonth() &&
          invoiceDate.getFullYear() === dateFilter.getFullYear()
        );
      }
      
      return matchesSearch && matchesDate;
    });
  }, [invoices, searchTerm, dateFilter]);

  // Manejar la eliminación de una factura
  const handleDeleteInvoice = (invoice: MembershipInvoice) => {
    setInvoiceToDelete(invoice);
  };

  // Confirmar la eliminación de una factura
  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteInvoiceMutation.mutate(invoiceToDelete.id);
    }
  };

  // Marcar una factura como pagada
  const markAsPaid = (id: number) => {
    markAsPaidMutation.mutate(id);
  };

  // Formatear el precio
  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(parseFloat(price));
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy");
  };

  // Obtener clase y texto para el estado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return { variant: "success" as const, icon: <CheckCircle className="w-3 h-3 mr-1" />, text: "Pagada" };
      case 'pending':
        return { variant: "outline" as const, icon: <Clock className="w-3 h-3 mr-1" />, text: "Pendiente" };
      case 'cancelled':
        return { variant: "destructive" as const, icon: <XCircle className="w-3 h-3 mr-1" />, text: "Cancelada" };
      case 'overdue':
        return { variant: "destructive" as const, icon: <Clock className="w-3 h-3 mr-1" />, text: "Vencida" };
      default:
        return { variant: "outline" as const, icon: null, text: status };
    }
  };

  return (
    <PlatformLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Facturas de Membresía</h1>
            <p className="text-muted-foreground">
              Gestiona las facturas de suscripción de las empresas
            </p>
          </div>
          <Button onClick={() => setLocation("/platform/invoices/new")}>
            <PlusIcon className="mr-2 h-4 w-4" /> Nueva Factura
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Facturas</CardTitle>
            <CardDescription>
              Lista de facturas de membresía de empresas
            </CardDescription>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por empresa o número..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Filtrar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="paid">Pagadas</SelectItem>
                    <SelectItem value="overdue">Vencidas</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateFilter ? (
                        format(dateFilter, "dd/MM/yyyy")
                      ) : (
                        <span>Fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFilter}
                      onSelect={setDateFilter}
                      initialFocus
                    />
                    {dateFilter && (
                      <div className="p-3 border-t border-border">
                        <Button
                          variant="ghost"
                          className="w-full justify-center text-xs"
                          onClick={() => setDateFilter(undefined)}
                        >
                          Limpiar filtro
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                <Button variant="outline" size="icon" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin">
                  <RefreshCw className="h-8 w-8 text-primary" />
                </div>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-2 text-lg font-medium">No hay facturas</h3>
                <p className="mt-1">
                  {searchTerm || statusFilter !== "all" || dateFilter
                    ? "No se encontraron facturas con los filtros aplicados" 
                    : "Aún no hay facturas de membresía registradas"}
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => setLocation("/platform/invoices/new")}
                >
                  <PlusIcon className="mr-2 h-4 w-4" /> Crear Factura
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Vencimiento</TableHead>
                      <TableHead>Fecha Pago</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice: MembershipInvoice) => {
                      const status = getStatusBadge(invoice.status);
                      const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status === 'pending';
                      const actualStatus = isOverdue ? getStatusBadge('overdue') : status;
                      
                      return (
                        <TableRow key={invoice.id} className={cn({
                          "bg-red-50": isOverdue,
                        })}>
                          <TableCell>{invoice.id}</TableCell>
                          <TableCell className="font-medium">
                            {invoice.companyName || `Empresa #${invoice.companyId}`}
                          </TableCell>
                          <TableCell>
                            {invoice.planName || `Plan #${invoice.planId}`}
                          </TableCell>
                          <TableCell>{formatPrice(invoice.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={actualStatus.variant}>
                              {actualStatus.icon} {actualStatus.text}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDate(invoice.dueDate)}
                          </TableCell>
                          <TableCell>
                            {invoice.paidDate ? formatDate(invoice.paidDate) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {invoice.status === "pending" && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => markAsPaid(invoice.id)}
                                  className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setLocation(`/platform/invoices/${invoice.id}`)}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDeleteInvoice(invoice)}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {filteredInvoices.length > 0 && (
              <div className="flex justify-end items-center mt-4 gap-4">
                <div className="text-sm text-muted-foreground">
                  {filteredInvoices.length} factura{filteredInvoices.length !== 1 ? 's' : ''} encontrada{filteredInvoices.length !== 1 ? 's' : ''}
                </div>
                <Button variant="outline" size="sm" onClick={() => {/* Exportar a Excel */}}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de confirmación para eliminar factura */}
      <Dialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la factura #{invoiceToDelete?.id} de{" "}
              <span className="font-bold">{invoiceToDelete?.companyName || `Empresa #${invoiceToDelete?.companyId}`}</span>?
              <p className="mt-2 text-destructive">
                Esta acción no se puede deshacer. La factura será eliminada permanentemente.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceToDelete(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
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