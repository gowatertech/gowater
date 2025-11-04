import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateRD } from "@/lib/date-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Search, DollarSign, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Customer {
  id: number;
  businessname: string;
  managername: string;
  phone: string;
}

interface PendingInvoice {
  id: number;
  invoiceNumber: string;
  total: string;
  date: string;
  status: string;
  paid: string;
  pending: string;
}

interface PendingInvoicesResponse {
  customerBalance: string;
  pendingInvoices: PendingInvoice[];
}

interface AccountPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountPaymentDialog({ open, onOpenChange }: AccountPaymentDialogProps) {
  const { toast } = useToast();
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // Cargar clientes
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: open,
  });

  // Cargar facturas pendientes y balance del cliente seleccionado
  const { data: invoicesData, isLoading: loadingInvoices } = useQuery<PendingInvoicesResponse>({
    queryKey: ["/api/customers", selectedCustomerId, "pending-invoices"],
    enabled: !!selectedCustomerId,
  });
  
  const pendingInvoices = invoicesData?.pendingInvoices || [];
  const customerBalance = invoicesData?.customerBalance || "0.00";

  // Filtrar clientes por búsqueda
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const term = customerSearch.toLowerCase();
    return customers.filter((c) =>
      c.businessname.toLowerCase().includes(term) ||
      c.managername.toLowerCase().includes(term) ||
      c.phone.includes(term)
    );
  }, [customers, customerSearch]);

  // Obtener cliente seleccionado
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Calcular el total de deuda pendiente
  const totalDebt = useMemo(() => {
    return pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.pending), 0);
  }, [pendingInvoices]);

  // Calcular la distribución del pago (preview)
  const paymentPreview = useMemo(() => {
    const paymentAmount = parseFloat(amount) || 0;
    const balance = parseFloat(customerBalance) || 0;
    
    if (paymentAmount <= 0) {
      return { invoices: [], cxcPayment: 0, remaining: 0 };
    }

    let remainingAmount = paymentAmount;
    const invoices = [];

    // Primero aplicar a facturas
    for (const invoice of pendingInvoices) {
      if (remainingAmount <= 0.01) break;

      const pendingAmount = parseFloat(invoice.pending);
      if (pendingAmount <= 0.01) continue;

      const amountToApply = Math.min(remainingAmount, pendingAmount);
      
      invoices.push({
        ...invoice,
        amountToApply: amountToApply.toFixed(2),
        willBePaid: amountToApply >= pendingAmount - 0.01,
      });

      remainingAmount -= amountToApply;
    }

    // Si no hay facturas PERO hay balance CXC, calcular pago a CXC
    let cxcPayment = 0;
    if (pendingInvoices.length === 0 && balance > 0) {
      cxcPayment = Math.min(paymentAmount, balance);
      remainingAmount = paymentAmount - cxcPayment;
    }

    return {
      invoices,
      cxcPayment,
      remaining: remainingAmount,
    };
  }, [amount, pendingInvoices, customerBalance]);

  // Mutación para aplicar el pago
  const applyPaymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest({
        method: "POST",
        url: "/api/payments/account-payment",
        data: {
          customerId: selectedCustomerId,
          amount: parseFloat(amount).toFixed(2),
          paymentMethod,
          reference: reference || undefined,
          notes: notes || undefined,
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Pago aplicado exitosamente",
        description: `Se aplicaron $${data.totalApplied} a ${data.paymentsCreated.length} factura(s)${data.advancePayment ? ` y se creó un anticipo de $${data.remainingAsAdvance}` : ''}`,
      });
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", selectedCustomerId, "pending-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      
      // Cerrar el diálogo y resetear el formulario
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error al aplicar pago",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomerId) {
      toast({
        title: "Error",
        description: "Debe seleccionar un cliente",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Error",
        description: "Debe ingresar un monto válido",
        variant: "destructive",
      });
      return;
    }

    applyPaymentMutation.mutate();
  };

  const handleClose = () => {
    setCustomerSearch("");
    setSelectedCustomerId(null);
    setAmount("");
    setPaymentMethod("cash");
    setReference("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Abono a Cuenta
          </DialogTitle>
          <DialogDescription>
            Aplicar un pago que se distribuirá automáticamente a las facturas pendientes del cliente desde la más antigua
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ScrollArea className="max-h-[60vh] pr-4">
            {/* Búsqueda de Cliente */}
            <div className="space-y-2">
              <Label htmlFor="customer-search">Cliente</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customer-search"
                    data-testid="input-customer-search"
                    placeholder="Buscar por nombre, encargado o teléfono..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Lista de clientes filtrados */}
              {customerSearch && filteredCustomers.length > 0 && (
                <Card className="p-2 max-h-40 overflow-y-auto">
                  {filteredCustomers.slice(0, 10).map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      data-testid={`button-select-customer-${customer.id}`}
                      onClick={() => {
                        setSelectedCustomerId(customer.id);
                        setCustomerSearch(customer.businessname);
                      }}
                      className="w-full text-left p-2 hover:bg-accent rounded-sm transition-colors"
                    >
                      <div className="font-medium">{customer.businessname}</div>
                      <div className="text-sm text-muted-foreground">
                        {customer.managername} • {customer.phone}
                      </div>
                    </button>
                  ))}
                </Card>
              )}

              {/* Cliente seleccionado */}
              {selectedCustomer && (
                <Card className="p-3 bg-primary/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{selectedCustomer.businessname}</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedCustomer.managername} • {selectedCustomer.phone}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      data-testid="button-clear-customer"
                      onClick={() => {
                        setSelectedCustomerId(null);
                        setCustomerSearch("");
                      }}
                    >
                      Cambiar
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* Facturas Pendientes */}
            {selectedCustomerId && (
              <div className="space-y-2 mt-4">
                <Label>Facturas Pendientes</Label>
                {loadingInvoices ? (
                  <div className="text-sm text-muted-foreground">Cargando facturas...</div>
                ) : pendingInvoices.length === 0 ? (
                  parseFloat(customerBalance) > 0 ? (
                    <Card className="p-4 text-center bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm font-medium mb-1">Cliente con balance CXC</p>
                      <p className="text-xs text-muted-foreground">
                        Balance: <span className="font-semibold text-red-600">${parseFloat(customerBalance).toFixed(2)}</span>
                      </p>
                    </Card>
                  ) : (
                    <Card className="p-4 text-center">
                      <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-medium">Este cliente no tiene facturas pendientes</p>
                    </Card>
                  )
                ) : (
                  <Card className="p-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">
                          {pendingInvoices.length} factura(s) pendiente(s)
                        </span>
                        <span className="text-sm font-semibold text-red-600">
                          Balance Cliente: ${parseFloat(customerBalance).toFixed(2)}
                        </span>
                      </div>
                      <Separator />
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {pendingInvoices.map((inv) => (
                          <div
                            key={inv.id}
                            className="flex justify-between items-center text-sm p-2 hover:bg-accent/50 rounded"
                          >
                            <div>
                              <span className="font-medium">#{inv.invoiceNumber}</span>
                              <span className="text-muted-foreground ml-2">
                                {formatDateRD(new Date(inv.date))}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-red-600">
                                ${inv.pending}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                de ${inv.total}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Detalles del Pago */}
            {selectedCustomerId && (pendingInvoices.length > 0 || parseFloat(customerBalance) > 0) && (
              <>
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto a Pagar *</Label>
                    <Input
                      id="amount"
                      data-testid="input-payment-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Método de Pago *</Label>
                    <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                      <SelectTrigger id="payment-method" data-testid="select-payment-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="card">Tarjeta</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference">Referencia (opcional)</Label>
                    <Input
                      id="reference"
                      data-testid="input-reference"
                      placeholder="Ej: Cheque #1234"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas (opcional)</Label>
                    <Input
                      id="notes"
                      data-testid="input-notes"
                      placeholder="Notas adicionales"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                {/* Preview de Aplicación del Pago */}
                {amount && parseFloat(amount) > 0 && (
                  <Card className="p-4 mt-4 bg-blue-50 dark:bg-blue-950/20">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Vista Previa de Aplicación del Pago
                    </h4>
                    <div className="space-y-2">
                      {/* Pago a Facturas */}
                      {paymentPreview.invoices.map((inv: any) => (
                        <div key={inv.id} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Factura #{inv.invoiceNumber}</span>
                            {inv.willBePaid && (
                              <Badge variant="secondary" className="text-xs">
                                Se pagará completa
                              </Badge>
                            )}
                          </div>
                          <span className="font-semibold text-green-600">
                            -${inv.amountToApply}
                          </span>
                        </div>
                      ))}
                      
                      {/* Pago a CXC (cuando no hay facturas) */}
                      {paymentPreview.cxcPayment > 0 && (
                        <div className="flex justify-between items-center text-sm bg-blue-100 dark:bg-blue-900/30 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">Aplicar a Balance CXC:</span>
                          </div>
                          <span className="font-semibold text-blue-700 dark:text-blue-400">
                            -${paymentPreview.cxcPayment.toFixed(2)}
                          </span>
                        </div>
                      )}
                      
                      {/* Anticipo por sobrante */}
                      {paymentPreview.remaining > 0.01 && (
                        <>
                          <Separator className="my-2" />
                          <div className="flex justify-between items-center text-sm bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded">
                            <span className="font-medium">Sobrante (se creará anticipo):</span>
                            <span className="font-semibold text-yellow-700 dark:text-yellow-500">
                              +${paymentPreview.remaining.toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}

                      <Separator className="my-2" />
                      <div className="flex justify-between items-center font-semibold">
                        <span>Total a Aplicar:</span>
                        <span className="text-lg text-primary">
                          ${parseFloat(amount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              data-testid="button-submit-payment"
              disabled={
                !selectedCustomerId ||
                !amount ||
                parseFloat(amount) <= 0 ||
                (pendingInvoices.length === 0 && parseFloat(customerBalance) <= 0) ||
                applyPaymentMutation.isPending
              }
            >
              {applyPaymentMutation.isPending ? "Procesando..." : "Aplicar Pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
